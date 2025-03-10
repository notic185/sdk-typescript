import _ from 'lodash';

// 扁平化对象工具
export class Simplifier {
    public static pileDown(
        target: Record<string, any>,
        keyPrefix: string = '',
    ): Record<string, unknown> {
        return _.transform(
            target,
            (result, value, key) => {
                const prefixedKey = keyPrefix ? `${keyPrefix}.${key}` : String(key);
                if (_.isObject(value)) {
                    _.assign(result, Simplifier.pileDown(value, prefixedKey));
                } else {
                    (result as any)[prefixedKey] = value;
                }
            },
            {},
        );
    }
}
