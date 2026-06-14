/** Spanish-aware count formatter: `n one` for n===1, else `n many`. */
export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
