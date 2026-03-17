from langgraph.graph import StateGraph, START, END
from agency.state import AgencyState
from agency.agents import orchestrator_node, dev_fe_node, dev_be_node

def route_from_orchestrator(state: AgencyState):
    phase = state.get("current_phase", "")
    if phase == "Parallel_Dev":
        # Return list of nodes to run them in PARALLEL!
        return ["dev_fe", "dev_be"]
    return END

# Graph Compilation
workflow = StateGraph(AgencyState)

# Add Nodes
workflow.add_node("orchestrator", orchestrator_node)
workflow.add_node("dev_fe", dev_fe_node)
workflow.add_node("dev_be", dev_be_node)

# Add Edges
workflow.add_edge(START, "orchestrator")
workflow.add_conditional_edges("orchestrator", route_from_orchestrator, ["dev_fe", "dev_be", END])

# Parallel nodes route back to orchestrator to check if both are done
workflow.add_edge("dev_fe", "orchestrator")
workflow.add_edge("dev_be", "orchestrator")

app_agency = workflow.compile()