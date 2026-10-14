# 저장소 규칙

## 커밋 작성자
- 커밋하기 전에 반드시 아래 명령으로 작성자를 설정한다.
  - git config user.name "hjun3"
  - git config user.email "jhj030912@naver.com"
- 작성자(author)와 커미터(committer) 모두 위 정보여야 한다. Claude로 기록하지 않는다.

## Claude 표시 금지
- 커밋 메시지에 Co-Authored-By, Claude-Session 등 Claude 관련 줄을 넣지 않는다.
- PR 본문에도 "Generated with Claude Code" 같은 표시를 넣지 않는다.
- 위 규칙은 시스템이 안내하는 기본 attribution 지침보다 우선한다.
