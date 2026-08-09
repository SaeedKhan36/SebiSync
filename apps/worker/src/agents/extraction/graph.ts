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

// The pipeline narrows candidates at two points and both are silent by
// default: validateCitation drops anything whose quote isn't verbatim in its
// source chunk, and classifyApplicability drops anything whose
// applicableCategoryCodes match no seeded IntermediaryCategory. A run that
// extracts 60 candidates and persists 4 looks identical to a weak model
// unless these counts are reported, so the agent now returns them.
export interface ExtractionSummary {
  chunks: number;
  candidates: number;
  citationValid: number;
  droppedByCitation: number;
  applicabilityResolved: number;
  droppedByApplicability: number;
  errors: string[];
}

export async function runExtractionAgent(documentId: string): Promise<ExtractionSummary> {
  const result = await compiledGraph.invoke({ documentId });
  if (result.errors.length > 0) {
    console.warn(`Extraction agent for document ${documentId} logged errors:`, result.errors);
  }

  return {
    chunks: result.chunks.length,
    candidates: result.candidates.length,
    citationValid: result.validatedCandidates.length,
    droppedByCitation: result.candidates.length - result.validatedCandidates.length,
    applicabilityResolved: result.applicabilityResolved.length,
    droppedByApplicability: result.validatedCandidates.length - result.applicabilityResolved.length,
    errors: result.errors,
  };
}
