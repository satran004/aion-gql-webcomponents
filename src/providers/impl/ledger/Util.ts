export class Util {
  static splitPath(path: string): number[] {
    let result = [];
    let components = path.split("/");
    components.forEach(element => {
      let number = parseInt(element, 10);
      if (isNaN(number)) {
        return; // FIXME shouldn't it throws instead?
      }
      if (element.length > 1 && element[element.length - 1] === "'") {
        number += 0x80000000;
      }
      result.push(number);
    });
    return result;
  }

  static foreach<T, A>(
    arr: T[],
    callback: (T, number) => Promise<A>
  ): Promise<A[]> {
    function iterate(index, array, result) {
      if (index >= array.length) {
        return result;
      } else
        return callback(array[index], index).then(function(res) {
          result.push(res);
          return iterate(index + 1, array, result);
        });
    }
    return Promise.resolve().then(() => iterate(0, arr, []));
  }
}
