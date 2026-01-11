export class NamingUtils {
  static camelToSnake(str: string): string {
    // Thêm xử lý để không bị gạch dưới ở đầu chuỗi nếu là PascalCase
    return str
      .replace(/([A-Z])/g, (letter, index) => {
        return index === 0 ? letter.toLowerCase() : `_${letter.toLowerCase()}`;
      });
  }

  static snakeToCamel(str: string): string {
    return str.replace(/(_\w)/g, (m) => m[1].toUpperCase());
  }

 private static isObject(item: any): boolean {
    return (
      item !== null &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      !(item instanceof Date) &&
      // Kiểm tra để không đệ quy vào các class instance như Decimal của Prisma
      (item.constructor === Object || Object.getPrototypeOf(item) === null)
    );
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