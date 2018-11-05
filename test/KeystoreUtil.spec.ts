import {KeyStoreUtil} from "../src/common/KeyStoreUtil";
// import {Buffer} from "buffer";

describe("Keystoreutil tests", () => {
  // @ts-ignore
  const keystores = require('./ksv3_test_vector.json');

  it('should decode rlp', async () => {

    for (let i = 0; i < keystores.length; i++) {
      const k = keystores[i];

      let ksv3 = KeyStoreUtil.fromRlp(k.ksv3)

      console.log(ksv3.address)
      console.log(ksv3.crypto)
      console.log(ksv3.version)

      expect(ksv3.address).toBe(k.address)
      expect(ksv3.crypto.kdfparams.salt).toBe(k.salt)
    }
  })
  /*it('should unlock account correctly', async () => {

    for (let i = 0; i < 2; i++) {
        const k = keystores[i];

       KeyStoreUtil.unlock(k.ksv3, k.password, (_progress) => { },
        (address, privateKey) => {

          console.log(address)
          console.log(privateKey)
        }, (error) => {console.log(error)} )

    }
  })*/

})
