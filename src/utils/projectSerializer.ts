import { ConversationNode } from "@/types/conversation";
import { Edge } from "@xyflow/react";

export interface SerializedProject {
  version: string;
  exportedAt: string;
  nodes: ConversationNode[];
  edges: Edge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    totalMessages: number;
  };
}

export const serializeProject = (
  nodes: ConversationNode[],
  edges: Edge[]
): SerializedProject => {
  const totalMessages = nodes.reduce((sum, node) => sum + node.messages.length, 0);

  return {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      totalMessages,
    },
  };
};

export const generateProjectMetadata = (
  projectName: string,
  projectDescription: string,
  creatorAddress: string,
  dataCid: string
) => {
  return {
    name: projectName,
    description: projectDescription,
    image: "", // Can be added later for NFT thumbnail
    external_url: `https://gateway.lighthouse.storage/ipfs/${dataCid}`,
    attributes: [
      {
        trait_type: "Creator",
        value: creatorAddress,
      },
      {
        trait_type: "Data CID",
        value: dataCid,
      },
      {
        trait_type: "Created At",
        value: new Date().toISOString(),
      },
    ],
  };
};
