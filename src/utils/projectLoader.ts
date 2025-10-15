import axios from "axios";
import { SerializedProject } from "./projectSerializer";

export const loadProjectFromIPFS = async (
  lighthouseCid: string
): Promise<SerializedProject> => {
  try {
    const response = await axios.get(
      `https://gateway.lighthouse.storage/ipfs/${lighthouseCid}`
    );
    return response.data;
  } catch (error) {
    console.error("Error loading project from IPFS:", error);
    throw new Error("Failed to load project data from IPFS");
  }
};

export const loadProjectMetadataFromIPFS = async (
  metadataCid: string
): Promise<any> => {
  try {
    const response = await axios.get(
      `https://gateway.lighthouse.storage/ipfs/${metadataCid}`
    );
    return response.data;
  } catch (error) {
    console.error("Error loading metadata from IPFS:", error);
    throw new Error("Failed to load project metadata from IPFS");
  }
};
