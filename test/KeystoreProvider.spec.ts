import KeystoreWalletProvider from "../src/providers/impl/KeystoreWalletProvider";

describe("Keystore provider tests", () => {
  // @ts-ignore
  const keystores = require('./ksv3_test_vector.json');

  it('should decode rlp', async () => {

    for (let i = 0; i < keystores.length; i++) {
      const k = keystores[i];

      let provider = new KeystoreWalletProvider(k.ksv3, k.password)

      console.log(provider)
      let ksv3 = provider.fromRlp(k.ksv3)

      console.log(ksv3.address)
      console.log(ksv3.crypto)
      console.log(ksv3.version)

      expect(ksv3.address).toBe(k.address)
      expect(ksv3.crypto.kdfparams.salt).toBe(k.salt)
    }
  })
  it('should unlock account correctly', async () => {

    let promises: Promise<[string, string]>[] = []

    let results = []

    for (let i = 0; i < 5; i++) {
        const k = keystores[i];

      let provider = new KeystoreWalletProvider(k.ksv3, k.password)

       let p = provider.unlock( (progress: number) => {
          console.log(progress)
       } )

      p.then(([address, publicKey]) => {
        console.log("address: " + i + " " + address)
        console.log("address: " + i + " " + publicKey)

        let result = {
          input: k,
          address: address,
          publicKey: publicKey
        }

        results.push(result)
      })
        .catch(
          error => {
            console.log(error)
            console.log("Error index: " + i)
            console.log("Error keystore privatekey: " + k.privateKey)
            throw new error
          }
        )
      promises.push(p)

    }

    console.log(promises.length)

    try {
      await Promise.all(promises)

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        expect(result.address).toBe("0x" + result.input.address)
        expect(result.publicKey).toBe("0x" + result.input.publicKey)
      }
    } catch (error) {
      throw error
    }

  })

})
