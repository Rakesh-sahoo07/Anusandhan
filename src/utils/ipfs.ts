/**
 * Utility functions for working with IPFS and Lighthouse
 */

export const LIGHTHOUSE_GATEWAY = "https://gateway.lighthouse.storage/ipfs";

/**
 * Get the full IPFS URL for a CID
 */
export const getIpfsUrl = (cid: string): string => {
  return `${LIGHTHOUSE_GATEWAY}/${cid}`;
};

/**
 * Fetch data from IPFS using CID
 */
export const fetchFromIpfs = async (cid: string): Promise<any> => {
  const url = getIpfsUrl(cid);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * Shorten a CID for display
 */
export const shortenCid = (cid: string, length: number = 8): string => {
  if (cid.length <= length * 2) return cid;
  return `${cid.slice(0, length)}...${cid.slice(-length)}`;
};
