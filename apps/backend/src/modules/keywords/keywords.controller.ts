import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KEYWORD_LIST } from '../../core';
import { KeywordsResponseDto } from './dto/keywords-response.dto';

@ApiTags('keywords')
@Controller('keywords')
export class KeywordsController {
  @Get()
  @ApiOperation({
    summary: '선택 가능한 키워드 목록',
    description:
      '화면이 키워드를 하드코딩하지 않도록 서버가 목록을 내려준다. ' +
      'core의 KEYWORD_TAG_MAP이 유일한 출처라, 매핑을 고치면 화면이 자동으로 따라간다.',
  })
  @ApiOkResponse({ type: KeywordsResponseDto })
  list(): KeywordsResponseDto {
    return { keywords: KEYWORD_LIST };
  }
}
