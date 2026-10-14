// 단어앱 → 구글 시트. 구글 시트의 [확장 프로그램 → Apps Script]에 이 내용을 통째로 붙여 넣는다.
// 학생 앱이 기록을 보낼 때마다 시트 3장을 고쳐 쓴다.
//   요약:   학생 한 명당 한 줄 (마지막 접속, 다음 할 DAY, 끝낸 DAY, 평균 점수, 단어 수)
//   단어:   모르는/헷갈리는 단어 한 개당 한 줄 (필터로 학생·상태별로 보기)
//   테스트: 테스트 본 DAY 한 개당 한 줄

const HEAD = {
  '요약': ['이름', '마지막 접속', '다음 할 DAY', '끝낸 DAY 수', '전체 DAY', '끝낸 DAY', '테스트 본 DAY 수', '평균 점수', '모르는 단어 수', '헷갈리는 단어 수', '학생ID'],
  '단어': ['이름', '상태', '번호', '단어', '뜻', 'DAY', '학생ID'],
  '테스트': ['이름', 'DAY', '최고 점수', '학생ID'],
};

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (!d.id || !d.name) return out('no id');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const at = new Date(d.at);
    const dayOf = n => Math.ceil(n / d.per);
    const scores = Object.keys(d.score || {}).map(Number).sort((a, b) => a - b);
    const avg = scores.length ? Math.round(scores.reduce((s, k) => s + d.score[k], 0) / scores.length) : '';

    replace('요약', d.id, [[d.name, at, d.nextDay, d.done.length, d.days, d.done.join(', '),
      scores.length, avg, d.unknown.length, d.confused.length, d.id]]);
    replace('단어', d.id, [
      ...d.unknown.map(([n, w, m]) => [d.name, '몰라요', n, w, m, dayOf(n), d.id]),
      ...d.confused.map(([n, w, m]) => [d.name, '헷갈려요', n, w, m, dayOf(n), d.id]),
    ]);
    replace('테스트', d.id, scores.map(k => [d.name, k, d.score[k], d.id]));
  } finally {
    lock.releaseLock();
  }
  return out('ok');
}

// 연결 확인용: 웹앱 주소를 브라우저로 열면 "ok"
function doGet() { return out('ok'); }

function out(t) { return ContentService.createTextOutput(t); }

// 시트에서 이 학생 줄을 지우고 새 줄로 바꿔 넣는다 (다른 학생 줄은 그대로)
function replace(name, id, rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const head = HEAD[name];
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(head);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  const idCol = head.length - 1;
  const old = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getValues() : [];
  const keep = old.filter(r => String(r[idCol]) !== String(id));
  const all = keep.concat(rows);
  if (old.length) sh.getRange(2, 1, old.length, head.length).clearContent();
  if (all.length) sh.getRange(2, 1, all.length, head.length).setValues(all);
  if (name === '요약') sh.getRange(2, 2, Math.max(all.length, 1), 1).setNumberFormat('m/d hh:mm');
}
