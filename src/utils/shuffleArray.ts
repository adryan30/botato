export function shuffleArray(array: any[]) {
  const modifiedArr = array;
  for (let i = modifiedArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [modifiedArr[i], modifiedArr[j]] = [modifiedArr[j], modifiedArr[i]];
  }
  console.log(modifiedArr);
  return modifiedArr;
}
