const fs = require("fs");
const iconv = require("iconv-lite");

/**
 * 바이너리로 읽은 뒤 지정 인코딩(기본 utf8)으로 디코딩합니다.
 * 한글 Windows CSV는 encoding: "cp949" (또는 "euc-kr") 를 쓰세요.
 *
 * @param {string} filePath
 * @param {string} [encoding="utf8"]
 * @returns {string}
 */
function readEncodedText(filePath, encoding = "utf8") {
  const buffer = fs.readFileSync(filePath);
  return iconv.decode(buffer, encoding);
}

/**
 * Buffer를 지정 인코딩으로 UTF-8 문자열로 변환합니다.
 * ZIP 내부 CSV 등에 사용.
 *
 * @param {Buffer} buffer
 * @param {string} [encoding="utf8"]
 * @returns {string}
 */
function decodeBuffer(buffer, encoding = "utf8") {
  return iconv.decode(buffer, encoding);
}

module.exports = {
  readEncodedText,
  decodeBuffer,
};
