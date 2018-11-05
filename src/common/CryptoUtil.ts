import blake2b from 'blake2b';

export class CryptoUtil {

  static A0_IDENTIFIER = CryptoUtil.hex2ua('a0');

  public static blake2b256(val) {
    var out = new Uint8Array(blake2b.BYTES);

    blake2b(blake2b.BYTES).update(val).digest(out);
    return out;
  }

  public static uia2hex(arrayBuffer, ignorePrefix = false) {
    if (typeof arrayBuffer !== 'object' || arrayBuffer === null || typeof arrayBuffer.byteLength !== 'number') {
      throw new TypeError('Expected input to be an ArrayBuffer')
    }

    var view = new Uint8Array(arrayBuffer)
    var result = ''
    var value

    for (var i = 0; i < view.length; i++) {
      value = view[i].toString(16)
      result += (value.length === 1 ? '0' + value : value)
    }

    if(!ignorePrefix)
      result = "0x" + result;

    return result
  }

  public static hex2ua(hex) {
    if (typeof hex !== 'string') {
      throw new TypeError('Expected input to be a string')
    }

    if ((hex.length % 2) !== 0) {
      throw new RangeError('Expected string to be an even number of characters')
    }

    var view = new Uint8Array(hex.length / 2)

    for (var i = 0; i < hex.length; i += 2) {
      view[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }

    return view
  }

  public static createA0Address(publicKeyBuffer) {
    let pkHash = CryptoUtil.blake2b256(publicKeyBuffer).slice(1, 32)
    let address = CryptoUtil.concatBuffer(CryptoUtil.A0_IDENTIFIER, pkHash, 32)
    return CryptoUtil.uia2hex(address);
  }

  public static concatBuffer(buffer1: Uint8Array, buffer2: Uint8Array, length) {
    var tmp = new Uint8Array(length)
    tmp.set(buffer1, 0)
    tmp.set(buffer2, buffer1.byteLength)
    return tmp
  }

  public static convertnAmpBalanceToAION(balance) {
    if(!balance)
      return 0
    else
      return balance / Math.pow(10, 18)
  }

  public static convertAIONTonAmpBalance(balance) {
    if(!balance)
      return 0
    else
      return balance * Math.pow(10, 18)
  }


}
