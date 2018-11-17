import Transport from "@ledgerhq/hw-transport-u2f";

import {Buffer} from "buffer";
import {Util} from "./Util";
import {CryptoUtil} from "../../util/CryptoUtil";
import {WalletProvider} from "../../WalletProvider";
import {Transaction} from "../../../common/Transaction";
import {SignedTransaction} from "../../../common/SignedTransaction";
import {TransactionUtil} from "../../util/TransactionUtil";

export class LedgerProvider implements WalletProvider {

  transport: Transport
  path = "44'/425'/0'/0'/0'"

  // @ts-ignore
  private address: string
  private publicKey: string

  constructor() {
    this.connect()
  }

  private async connect() {
    // await

    return Transport.create().then(_transport => {
      _transport.decorateAppAPIMethods(
        this,
        [
          "getAddress",
          "sign"

        ],
        "aion"
      );
      return _transport
    })
  }

  public async unlock(progressCallback: (number) => void): Promise<[string, string]> {
    try {
      if (!this.transport)
        this.transport = await this.connect()

      let result = await this.getAddress(this.path, true, false)

      if (progressCallback)
        progressCallback(100)

      this.address = result.address
      this.publicKey = result.publicKey

      return [result.address, result.publicKey]
    } catch (e) {
      console.log("Error getting address", e)
      throw e
    }
  }

  /**
   * get Aion address for a given BIP 32 path.
   * @param path a path in BIP 32 format
   * @option boolDisplay optionally enable or not the display
   * @option boolChaincode optionally enable or not the chaincode request
   * @return an object with a publicKey, address
   * @example
   */
   getAddress(
    path: string,
    boolDisplay?: boolean,
    boolChaincode?: boolean
  ): Promise<{
    publicKey: string,
    address: string
  }> {
    let paths = Util.splitPath(path);
    let buffer = new Buffer(1 + paths.length * 4);
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });

    // let buffer1 = new Buffer("15058000002c800001a9800000008000000080000000", 'hex')
    return this.transport.send(
      0xe0,
      0x02,
      boolDisplay ? 0x01 : 0x00,
      boolChaincode ? 0x01 : 0x00,
      buffer
    )
      .then(response => {

        let result = {
          publicKey: '',
          address: ''
        }

        if (response.length < 64)
          throw new Error("Invalid response for getAddress")

        //First 32 byte is public key and then address
        let publicKeyBuff = response.slice(0, 32)
        let addressBuff = response.slice(32, 64)

        result.publicKey = CryptoUtil.uia2hex(publicKeyBuff, true) //ignore 0x
        result.address = CryptoUtil.uia2hex(addressBuff)

        return result
      });
  }

  // @ts-ignore
  async sign(transaction: Transaction): Promise<SignedTransaction> {
    let rawTransaction = TransactionUtil.rlpEncode(transaction)
    let rawTxHash = CryptoUtil.uia2hex(rawTransaction, true)

    let paths = Util.splitPath(this.path);
    let offset = 0;

    let rawTx = new Buffer(rawTxHash, "hex");
    let toSend = [];
    let response;

    while (offset !== rawTx.length) {
      let maxChunkSize = offset === 0 ? 150 - 1 - paths.length * 4 : 150;
      let chunkSize =
        offset + maxChunkSize > rawTx.length
          ? rawTx.length - offset
          : maxChunkSize;
      let buffer = new Buffer(
        offset === 0 ? 1 + paths.length * 4 + chunkSize : chunkSize
      );
      if (offset === 0) {
        buffer[0] = paths.length;
        paths.forEach((element, index) => {
          buffer.writeUInt32BE(element, 1 + 4 * index);
        });
        rawTx.copy(buffer, 1 + 4 * paths.length, offset, offset + chunkSize);
      } else {
        rawTx.copy(buffer, 0, offset, offset + chunkSize);
      }
      toSend.push(buffer);
      offset += chunkSize;
    }

    return Util.foreach(toSend, (data, i) => {
      return this.transport
        .send(0xe0, 0x04, i === 0 ? 0x00 : 0x80, 0x00, data)
        .then(apduResponse => {
          response = apduResponse;
        })}
    ).then(() => {
      // const v = response.slice(0, 1);
      // const r = response.slice(1, 1 + 32);
      // const s = response.slice(1 + 32, 1 + 32 + 32);
      //return { v, r, s };
      let signature = response.slice(0, 64) //get first 64 bytes for signature

      return TransactionUtil.verifyAndEncodedSignTransaction(transaction, rawTransaction, signature, CryptoUtil.hex2ua(this.publicKey))
    });

  }

}
