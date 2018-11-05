import { AionBlocks } from './aion-blocks';

it('should initialize AionBlocks', async () => {
  const aionBlocks = new AionBlocks();

  expect(aionBlocks).not.toBe(null)
});

