import {WalletProvider} from "../WalletProvider";
import {Buffer} from "buffer";
import rlp from "aion-rlp"
import {CryptoUtil} from "../../common/CryptoUtil";
import nacl from "tweetnacl";
import scrypt from "scrypt-js"
import aesjs from "aes-js"
import {Transaction} from "../../common/Transaction";
import {SignedTransaction} from "../../common/SignedTransaction";
import {TransactionUtil} from "../../common/TransactionUtil";

//Logic taken from https://github.com/qoire/aion-keystore
export default class KeystoreWalletProvider implements WalletProvider {

  private keystore: ArrayBuffer|string
  private password: string

  private privateKey: string
  private publicKey: string
  private address: string

  constructor(keystore: string|ArrayBuffer, password: string) {
    this.keystore = keystore
    this.password = password
  }

  init(keystore: ArrayBuffer, password: string) {
    this.keystore = keystore
    this.password = password

    this.privateKey = null
    this.publicKey = null
    this.address = null
  }

  async unlock(progressCallback: (number) => void): Promise<[string, string]> {
    try {

      if (!this.password) {
        throw new Error('No password given.');
      }
      let ksv3 = this.fromRlp(this.keystore)

      console.log(ksv3)
      return this._decrypt(ksv3, this.password, progressCallback)
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  async sign(transaction: Transaction): Promise<SignedTransaction> {
    let mainThis = this
    if (!mainThis.privateKey) {
      throw new Error("Can not sign a transaction with null privatekey")
    }

    let encodedSignedTxn = TransactionUtil.signTransaction(transaction, mainThis.privateKey)
    return encodedSignedTxn
  }

  public fromRlp(keystore) {
    let hexContent = Buffer.from(keystore, 'hex');

    let Ksv3 = rlp.decode(hexContent)

    const Crypto = rlp.decode(Ksv3[3]);
    const Cipherparams = rlp.decode(Crypto[4]);
    const Kdfparams = rlp.decode(Crypto[5]);

    let ksv3Json = {
      id: Ksv3[0].toString('utf8'),
      version: parseInt(Ksv3[1].toString('hex'), 16),
      address: Ksv3[2].toString('utf8'),
      crypto: {
        cipher: Crypto[0].toString('utf8'),
        ciphertext: Crypto[1].toString('utf8'),
        kdf: Crypto[2].toString('utf8'),
        mac: Crypto[3].toString('utf8'),
        cipherparams: {
          iv: Cipherparams[0].toString('utf8')
        },
        kdfparams: {
          dklen: parseInt(Kdfparams[1].toString('hex'), 16),
          n: parseInt(Kdfparams[2].toString('hex'), 16),
          p: parseInt(Kdfparams[3].toString('hex'), 16),
          r: parseInt(Kdfparams[4].toString('hex'), 16),
          salt: Kdfparams[5].toString('utf8')
        }
      }
    };
    return ksv3Json

  }

  private async _decrypt(v3Keystore, password, progressCallback): Promise<[string, string]> {
    if (!password) {
      throw new Error('No password given.')
    }

    let json = v3Keystore

    if (json.version !== 3) {
      throw new Error('Not a valid V3 wallet')
    }

    let mainThis = this;

    return new Promise<[string,string]>(function(resolve, reject) {

      //let derivedKey;
      let kdfparams;
      if (json.crypto.kdf === 'scrypt') {
        kdfparams = json.crypto.kdfparams;

        scrypt(new Buffer(password), new Buffer(kdfparams.salt, 'hex'), kdfparams.n, kdfparams.r,
          kdfparams.p, kdfparams.dklen, function (error, _progress, key) {
            if (error) {
              console.log("Error: " + error)
              reject(error)
              //throw error
            } else if (key) {

              console.log("Start unlocking.....")
              try {
                const ciphertext = new Buffer(json.crypto.ciphertext, 'hex');

                let buffKey = new Buffer(key) //without this, the mac doesn't match.

                let mac = CryptoUtil.uia2hex(CryptoUtil.blake2b256(Buffer.concat([buffKey.slice(16, 32), ciphertext])))

                if (!json.crypto.mac.startsWith("0x"))
                  mac = mac.substring(2)

                if (mac !== json.crypto.mac) {
                  throw new Error('Key derivation failed - possibly wrong password');
                }

                if (json.crypto.cipher !== 'aes-128-ctr')
                  throw new Error("Cipher not supported yet : " + json.crypto.cipher)

                const aesCbc = new aesjs.ModeOfOperation.ctr(buffKey.slice(0, 16), new Buffer(json.crypto.cipherparams.iv, 'hex'))
                const seed = aesCbc.decrypt(ciphertext)

                let keyPair = mainThis._createKeyPair(seed)

                mainThis.address = CryptoUtil.createA0Address(keyPair._publicKey)
                mainThis.privateKey = CryptoUtil.uia2hex(keyPair._privateKey, true)

                mainThis.publicKey = CryptoUtil.uia2hex(keyPair._publicKey)

                resolve([mainThis.address, mainThis.publicKey])
                // successCallback(address, privateKeyHex)

                //  const decipher = cryp.createDecipheriv(json.crypto.cipher, buffKey.slice(0, 16), new Buffer(json.crypto.cipherparams.iv, 'hex'));
                // const seed = '0x'+ Buffer.concat([ decipher.update(ciphertext), decipher.final() ]).toString('hex');
                // return this.privateKeyToAccount(seed);
              } catch (error) {
                console.error(error)
                // errorCallback(error)
                //throw error
                reject(error)
              }

            } else {
              // update UI with progress complete
              if (progressCallback)
                progressCallback(_progress * 100)
            }
          });

        //return [this.address, this.publicKey]

      } else if (json.crypto.kdf === 'pbkdf2') {
        let error = new Error('pbkdf2 is unsupported by AION keystore format');
        console.error(error)
        //throw error
        reject(error)
      } else {
        let error = new Error('Unsupported key derivation scheme');
        console.error(error)
        //throw error
        reject(error)
      }

    });

  }

  // @ts-ignore
  private _createKeyPair(privateKey) {

    let kp
    let keyPair

    if (privateKey !== undefined) {
      //kp = nacl.sign.keyPair.fromSecretKey(Buffer.from(privateKey))
      kp = nacl.sign.keyPair.fromSecretKey(privateKey)
      keyPair = {
        _privateKey: Buffer.from(kp.secretKey),
        _publicKey: Buffer.from(kp.publicKey)
      }
      return keyPair
    }
  }
}
