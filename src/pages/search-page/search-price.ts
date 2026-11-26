const pricePattern = /^\d{1,10}(?:\.\d{1,2})?$/;
const formatError = 'Введите цену от 0 до 9 999 999 999,99 ₽, максимум с двумя знаками после запятой.';

export function validatePrices(min = '', max = '') {
    const priceMinError = min && !pricePattern.test(min) ? formatError : '';
    let priceMaxError = max && !pricePattern.test(max) ? formatError : '';

    if (!priceMinError && !priceMaxError && min && max && Number(min) > Number(max)) {
        priceMaxError = 'Цена «до» должна быть больше или равна цене «от».';
    }

    return { priceMinError, priceMaxError };
}
