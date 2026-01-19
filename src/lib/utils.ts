export class NamingUtils {
  static camelToSnake(str: string): string {
    // Thêm xử lý để không bị gạch dưới ở đầu chuỗi nếu là PascalCase
    return str.replace(/([A-Z])/g, (_match, letter, offset) => {
      return offset === 0 ? letter.toLowerCase() : `_${letter.toLowerCase()}`;
    });
  }

  static snakeToCamel(str: string): string {
    return str.replace(/(_\w)/g, (m) => m[1].toUpperCase());
  }

  private static isObject(item: any): boolean {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return false;
    }
    // Bỏ qua Date
    if (item instanceof Date) {
      return false;
    }
    // Kiểm tra nếu là Decimal hoặc các class đặc biệt khác của Prisma
    const constructorName = item.constructor?.name;
    if (constructorName === 'Decimal' || constructorName === 'BigInt') {
      return false;
    }
    // Kiểm tra Decimal pattern (có thể đã được serialize thành plain object)
    // Decimal có structure: { s: number, e: number, d: number[] }
    if ('s' in item && 'e' in item && 'd' in item && Array.isArray(item.d)) {
      return false;
    }
    // Cho phép cả plain object và class instance (DTO)
    return true;
  }

  static toSnakeCase(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((v) => this.toSnakeCase(v));
    } else if (this.isObject(obj)) {
      return Object.keys(obj).reduce((result, key) => {
        const value = obj[key];
        return {
          ...result,
          [this.camelToSnake(key)]: this.toSnakeCase(value),
        };
      }, {});
    }
    return obj;
  }

  static toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((v) => this.toCamelCase(v));
    } else if (this.isObject(obj)) {
      return Object.keys(obj).reduce((result, key) => {
        const value = obj[key];
        return {
          ...result,
          [this.snakeToCamel(key)]: this.toCamelCase(value),
        };
      }, {});
    }
    return obj;
  }
}
