from typing import TypedDict, List, Dict, Annotated
import operator

def merge_dict(a: Dict[str, str], b: Dict[str, str]) -> Dict[str, str]:
    if a is None: a = {}
    if b is None: b = {}
    return {**a, **b}

def merge_phase(a: str, b: str) -> str:
    if not a: return b
    if not b: return a
    if ("Done" in a) and ("Done" in b) and (a != b):
        return "Done_Both"
    return b

class AgencyState(TypedDict):
    task_description: str
    current_phase: Annotated[str, merge_phase] 
    generated_code: Annotated[Dict[str, str], merge_dict]
    validation_errors: Annotated[List[str], operator.add]
    trace_id: str
    approval_required: bool
    log: str
    revision_count: int