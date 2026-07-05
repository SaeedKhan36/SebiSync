import { StateGraph } from "@langchain/langgraph";
import { ExtractionState } from "./state";
import { loadContext } from "./nodes/loadContext";
import { extractObligations } from "./nodes/extractObligations";
import { validateCitation } from "./nodes/validateCitation";
import { classifyApplicability } from "./nodes/classifyApplicability";
import { persist } from "./nodes/persist";

const graph = new StateGraph(ExtractionState)
  .addNode("loadContext", loadContext)
  .addNode("extractObligations", extractObligations)
  .addNode("validateCitation", validateCitation)
  .addNode("classifyApplicability", classifyApplicability)
  .addNode("persist", persist)
  .addEdge("__start__", "loadContext")
  .addEdge("loadContext", "extractObligations")
  .addEdge("extractObligations", "validateCitation")
  .addEdge("validateCitation", "classifyApplicability")
  .addEdge("classifyApplicability", "persist")
  .addEdge("persist", "__end__");

const compiledGraph = graph.compile();

export async function runExtractionAgent(documentId: string): Promise<void> {
  const result = await compiledGraph.invoke({ documentId });
  if (result.errors.length > 0) {
    console.warn(`Extraction agent for document ${documentId} logged errors:`, result.errors);
  }
}
