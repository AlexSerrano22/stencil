import * as d from '../declarations';
import { normalizePath } from './normalize-path';

export const isDef = (v: any) => v != null;

export const toLowerCase = (str: string) => str.toLowerCase();

export const toDashCase = (str: string) => toLowerCase(str.replace(/([A-Z0-9])/g, g => ' ' + g[0]).trim().replace(/ /g, '-'));

export const dashToPascalCase = (str: string) => toLowerCase(str).split('-').map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)).join('');

export const toTitleCase = (str: string) => str.charAt(0).toUpperCase() + str.substr(1);

export const captializeFirstLetter = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const noop = (): any => { /* noop*/ };

export function sortBy<T>(array: T[], prop: ((item: T) => string)) {
  return array.slice().sort((a, b) => {
    const nameA = prop(a);
    const nameB = prop(b);
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
}

export function flatOne<T>(array: T[][]): T[] {
  if (array.flat) {
    return array.flat(1);
  }
  return array.reduce((result, item) => {
    result.push(...item);
    return result;
  }, [] as T[]);
}

export function unduplicate<T>(array: T[], predicate: (item: T) => any): T[] {
  const set = new Set();
  return array.filter(item => {
    const key = predicate(item);
    if (set.has(key)) {
      return false;
    }
    set.add(key);
    return true;
  });
}

export function relativeImport(config: d.Config, pathFrom: string, pathTo: string, ext?: string) {
  let relativePath = config.sys.path.relative(config.sys.path.dirname(pathFrom), config.sys.path.dirname(pathTo));
  if (relativePath === '') {
    relativePath = '.';
  } else if (relativePath[0] !== '.') {
    relativePath = './' + relativePath;
  }
  return normalizePath(`${relativePath}/${config.sys.path.basename(pathTo, ext)}`);
}

export const pluck = (obj: {[key: string]: any }, keys: string[]) => {
  return keys.reduce((final, key) => {
    if (obj[key]) {
      final[key] = obj[key];
    }
    return final;
  }, {} as {[key: string]: any});
};

export const isObject = (val: Object) => {
  return val != null && typeof val === 'object' && Array.isArray(val) === false;
};
