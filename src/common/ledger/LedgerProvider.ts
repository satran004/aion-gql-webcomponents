import Transport from "@ledgerhq/hw-transport-u2f";

import {Buffer} from "buffer";
import {Util} from "./Util";
import {CryptoUtil} from "../CryptoUtil";

export class LedgerProvider {

  transport: Transport
  path = "44'/425'/0'/0'/0'"

  constructor() {

  }

  public async connect() {
    // await
    try {
      let _transport = await Transport.create()

      _transport.decorateAppAPIMethods(
        this,
        [
          "getAddress",
          "sign"

        ],
        "aion"
      );

      this.transport = _transport
    }catch (e) {
      console.error("Unable to connect to ledger ", e)
      throw e
    }
  }

  public async getAddress() {

    try {
      let result = await this._getAddress(this.path, true, false)
      return result
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
  private _getAddress(
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

        if(response.length < 64)
          throw new Error("Invalid response for getAddress")

        //First 32 byte is public key and then address
        let publicKeyBuff = response.slice(0,32)
        let addressBuff = response.slice(32, 64)

        result.publicKey = CryptoUtil.uia2hex(publicKeyBuff)
        result.address = CryptoUtil.uia2hex(addressBuff)

        return result
      });
  }

  getAppConfiguration(): Promise<{
    arbitraryDataEnabled: number,
    version: string
  }> {
    return this.transport.send(0xe0, 0x06, 0x00, 0x00).then(response => {
      let result = {
        arbitraryDataEnabled: null,
        version: null
      };
      result.arbitraryDataEnabled = response[0] & 0x01;
      result.version = "" + response[1] + "." + response[2] + "." + response[3];
      return result;
    });
  }


}
