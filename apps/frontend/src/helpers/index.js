export const convertObjectValuesToPercentages = (obj) => {
  const total = Object.entries(obj).reduce(
    (a, [key, value]) => a + (key !== 'timestamp' ? value : 0),
    0
  );

  const newObj = {};

  for (const key in obj) {
    newObj[key] = (obj[key] / total) * 100;
  }

  return newObj;
};
