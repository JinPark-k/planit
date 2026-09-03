import {
  PICKS_PER_DAY,
  pickCountLabel,
  pickGuide,
  recommendedPickCount,
} from './pickList.format';

describe('recommendedPickCount', () => {
  it('일수에 하루 권장치를 곱한다', () => {
    expect(recommendedPickCount(1)).toBe(PICKS_PER_DAY);
    expect(recommendedPickCount(3)).toBe(12);
    expect(recommendedPickCount(5)).toBe(20);
  });

  it('0일 이하가 들어와도 최소 하루로 친다', () => {
    // 화면에서는 1~5만 고를 수 있지만, 0을 곱해 "0곳 추천"이 되면 안 된다.
    expect(recommendedPickCount(0)).toBe(PICKS_PER_DAY);
    expect(recommendedPickCount(-1)).toBe(PICKS_PER_DAY);
  });
});

describe('pickGuide', () => {
  it('권장치 이하면 몇 곳이 알맞은지 알려준다', () => {
    const guide = pickGuide(3, 8);
    expect(guide.overRecommended).toBe(false);
    expect(guide.message).toContain('3일 일정에는 12곳');
  });

  it('권장치와 같으면 아직 초과가 아니다', () => {
    expect(pickGuide(3, 12).overRecommended).toBe(false);
  });

  it('권장치를 넘으면 어조가 바뀐다', () => {
    // 서버가 하루 마감을 넘는 장소를 빼기 전에 미리 알리는 것이 이 문구의 목적이다.
    const guide = pickGuide(3, 13);
    expect(guide.overRecommended).toBe(true);
    expect(guide.message).toContain('12곳을 넘었어요');
    expect(guide.message).toContain('일정에 들어가지 못할 수 있어요');
  });

  it('아무것도 안 담았을 때도 안내가 나온다', () => {
    expect(pickGuide(2, 0).message).toContain('2일 일정에는 8곳');
  });
});

describe('pickCountLabel', () => {
  it('담은 개수와 권장 개수를 함께 보여준다', () => {
    expect(pickCountLabel(3, 8)).toBe('8곳 담음 · 12곳 추천');
    expect(pickCountLabel(1, 0)).toBe('0곳 담음 · 4곳 추천');
  });
});
