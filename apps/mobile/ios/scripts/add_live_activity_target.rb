#!/usr/bin/env ruby
# frozen_string_literal: true

# Xcode GUI로 "File > New > Target > Widget Extension"을 누르는 대신,
# project.pbxproj 그래프를 코드로 직접 조작해 Live Activity에 필요한 프로젝트
# 구조를 만든다. GUI 조작은 재현이 안 되고 리뷰도 안 되지만, 이 스크립트는
# 커밋으로 남고 diff로 리뷰할 수 있다.
#
# 여러 번 실행해도 안전하다(idempotent) — 이미 있는 타겟/그룹/파일 참조/
# 빌드 페이즈 항목은 건너뛰고 없는 것만 만든다. 그래서 "GUI로 일부 손댄 뒤
# 다시 이 스크립트를 돌리는" 것도, "처음부터 이 스크립트만으로 다시 만드는"
# 것도 같은 결과로 수렴한다.
#
# 실행:
#   ruby ios/scripts/add_live_activity_target.rb
# (저장소 어디에서 실행해도 된다 — 이 파일 위치 기준으로 ios/Mobile.xcodeproj를 찾는다)

require 'xcodeproj'

IOS_DIR = File.expand_path('..', __dir__)
PROJECT_PATH = File.join(IOS_DIR, 'Mobile.xcodeproj')

APP_TARGET_NAME = 'Mobile'
WIDGET_TARGET_NAME = 'PlanitLiveActivity'
WIDGET_BUNDLE_ID = 'com.mjj.planit.LiveActivity'
WIDGET_DEPLOYMENT_TARGET = '16.2'
TEAM_ID = 'Y4Q4TS7RTR'
MARKETING_VERSION = '1.0.1'
CURRENT_PROJECT_VERSION = '5'
APP_PROVISIONING_PROFILE = 'planit AppStore'
WIDGET_PROVISIONING_PROFILE = 'planit LiveActivity AppStore'

# ---------------------------------------------------------------------------
# 그룹/파일 헬퍼 — 기존 pbxproj 스타일(그룹엔 path 없이 name만 두고, 파일
# 참조는 프로젝트 루트(ios/) 기준 전체 상대경로를 그대로 쓴다)을 따른다.
# ---------------------------------------------------------------------------

def find_or_create_group(parent, name)
  parent.groups.find { |g| g.display_name == name } || parent.new_group(name)
end

def find_or_create_file(group, project, relative_path)
  project.files.find { |f| f.path == relative_path } || group.new_reference(relative_path)
end

def ensure_in_target_sources(target, file_ref)
  return if target.source_build_phase.build_file(file_ref)

  target.add_file_references([file_ref])
end

project = Xcodeproj::Project.open(PROJECT_PATH)

app_target = project.targets.find { |t| t.name == APP_TARGET_NAME }
raise "앱 타겟 '#{APP_TARGET_NAME}'을 찾을 수 없습니다" unless app_target

main_group = project.main_group
mobile_group = find_or_create_group(main_group, 'Mobile')
live_activity_group = find_or_create_group(mobile_group, 'LiveActivity')

# ---------------------------------------------------------------------------
# 1) LiveActivityModule.swift/.m을 앱 타겟 Sources에 추가
#    (기존에 디스크엔 있었지만 pbxproj에 등록되지 않아 빌드에서 빠져 있었다)
# ---------------------------------------------------------------------------
%w[LiveActivityModule.swift LiveActivityModule.m].each do |basename|
  ref = find_or_create_file(live_activity_group, project, "Mobile/LiveActivity/#{basename}")
  ensure_in_target_sources(app_target, ref)
end

# 앱 타겟과 위젯 타겟이 공유하는 소스 — ActivityAttributes/모델/스토어/
# 컨트롤러/Intent는 두 프로세스(앱, 위젯 익스텐션) 모두에서 컴파일돼야 한다.
shared_basenames = %w[
  TripActivityAttributes.swift
  TripPlan.swift
  TripSessionStore.swift
  TripLiveActivityController.swift
  NextStopIntent.swift
]
shared_refs = shared_basenames.map do |basename|
  find_or_create_file(live_activity_group, project, "Mobile/LiveActivity/#{basename}")
end
shared_refs.each { |ref| ensure_in_target_sources(app_target, ref) }

# 앱 타겟 Mobile.entitlements 파일 참조(빌드 설정에서 경로로 참조되지만,
# Xcode 내비게이터에 보이도록 등록도 해 둔다).
app_entitlements_ref = find_or_create_file(mobile_group, project, 'Mobile/Mobile.entitlements')

# ---------------------------------------------------------------------------
# 2) Widget Extension 타겟 생성
# ---------------------------------------------------------------------------
widget_target = project.targets.find { |t| t.name == WIDGET_TARGET_NAME }
widget_created = widget_target.nil?

if widget_created
  widget_target = project.new_target(
    :app_extension,
    WIDGET_TARGET_NAME,
    :ios,
    WIDGET_DEPLOYMENT_TARGET,
    project.products_group,
    :swift,
    WIDGET_TARGET_NAME
  )
end

widget_group = find_or_create_group(main_group, WIDGET_TARGET_NAME)

widget_only_basenames = %w[
  PlanitLiveActivityBundle.swift
  TripLiveActivityWidget.swift
]
widget_only_refs = widget_only_basenames.map do |basename|
  find_or_create_file(widget_group, project, "#{WIDGET_TARGET_NAME}/#{basename}")
end
widget_only_refs.each { |ref| ensure_in_target_sources(widget_target, ref) }
shared_refs.each { |ref| ensure_in_target_sources(widget_target, ref) }

# Info.plist / entitlements — 빌드 설정에서 경로로만 쓰이므로 빌드 페이즈에는
# 넣지 않는다(Resources 페이즈 X). Xcode 내비게이터 가시성을 위해 참조만 등록.
find_or_create_file(widget_group, project, "#{WIDGET_TARGET_NAME}/Info.plist")
find_or_create_file(widget_group, project, "#{WIDGET_TARGET_NAME}/#{WIDGET_TARGET_NAME}.entitlements")

# ---------------------------------------------------------------------------
# 3) 위젯 타겟 빌드 설정
# ---------------------------------------------------------------------------
widget_target.build_configurations.each do |config|
  bs = config.build_settings
  bs['PRODUCT_NAME'] = WIDGET_TARGET_NAME
  bs['PRODUCT_BUNDLE_IDENTIFIER'] = WIDGET_BUNDLE_ID
  bs['IPHONEOS_DEPLOYMENT_TARGET'] = WIDGET_DEPLOYMENT_TARGET
  bs['SUPPORTED_PLATFORMS'] = 'iphoneos iphonesimulator'
  bs['TARGETED_DEVICE_FAMILY'] = '1'
  # 앱과 위젯의 버전은 반드시 같아야 한다 — 다르면 App Store Connect 업로드가
  # "The version/build number ... does not match" 류로 거부된다.
  bs['MARKETING_VERSION'] = MARKETING_VERSION
  bs['CURRENT_PROJECT_VERSION'] = CURRENT_PROJECT_VERSION
  bs['VERSIONING_SYSTEM'] = 'apple-generic'
  bs['SWIFT_VERSION'] = '5.0'
  bs['DEVELOPMENT_TEAM'] = TEAM_ID
  bs['SKIP_INSTALL'] = 'NO'
  bs['CODE_SIGN_ENTITLEMENTS'] = "#{WIDGET_TARGET_NAME}/#{WIDGET_TARGET_NAME}.entitlements"
  bs['INFOPLIST_FILE'] = "#{WIDGET_TARGET_NAME}/Info.plist"
  # 이 프로젝트는 objectVersion 54 / Xcode 12 호환 스타일로 Info.plist를
  # 직접 관리한다(GENERATE_INFOPLIST_FILE 자동 생성 방식이 아니다) — 앱
  # 타겟과 동일한 관례를 따른다.
  bs['GENERATE_INFOPLIST_FILE'] = 'NO'
  bs['LD_RUNPATH_SEARCH_PATHS'] = [
    '$(inherited)',
    '@executable_path/Frameworks',
    '@executable_path/../../Frameworks',
  ]

  if config.name == 'Release'
    bs['CODE_SIGN_STYLE'] = 'Manual'
    bs['CODE_SIGN_IDENTITY'] = 'iPhone Distribution'
    bs['PROVISIONING_PROFILE_SPECIFIER'] = WIDGET_PROVISIONING_PROFILE
  else
    bs['CODE_SIGN_STYLE'] = 'Automatic'
    bs.delete('PROVISIONING_PROFILE_SPECIFIER')
    bs.delete('CODE_SIGN_IDENTITY')
  end
end

# ---------------------------------------------------------------------------
# 4) 앱 타겟 → 위젯을 PlugIns로 임베드 + 타겟 의존성
# ---------------------------------------------------------------------------
embed_phase = app_target.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' }
embed_phase ||= app_target.new_copy_files_build_phase('Embed Foundation Extensions')
embed_phase.symbol_dst_subfolder_spec = :plug_ins

widget_product_ref = widget_target.product_reference
unless embed_phase.files_references.include?(widget_product_ref)
  build_file = embed_phase.add_file_reference(widget_product_ref)
  # RemoveHeadersOnCopy: 익스텐션을 앱 번들 안으로 복사할 때 헤더 파일은
  # 빼는 표준 설정(Xcode가 GUI로 만들 때도 항상 붙인다).
  build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
end

app_target.add_dependency(widget_target)

# ---------------------------------------------------------------------------
# 5) 앱 타겟 CODE_SIGN_ENTITLEMENTS
# ---------------------------------------------------------------------------
app_target.build_configurations.each do |config|
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'Mobile/Mobile.entitlements'
end

project.save

puts "완료. #{widget_created ? '위젯 타겟을 새로 만들었습니다.' : '위젯 타겟이 이미 있어 설정만 갱신했습니다.'}"
