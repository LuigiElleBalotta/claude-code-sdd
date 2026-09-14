export function countAllTasks(nodes) {
    let count = 0;
    for (const node of nodes) {
        count += 1 + countAllTasks(node.children);
    }
    return count;
}
/**
 * A specification is complete only when every top-level task is done.
 * An empty top-level list is never "complete" — it means no tasks were
 * defined yet, which is not the same as done.
 */
export function isTaskListComplete(topLevel) {
    return topLevel.length > 0 && topLevel.every((task) => task.done);
}
export function computeTaskProgress(topLevel) {
    const totalTopLevel = topLevel.length;
    const completedTopLevel = topLevel.filter((t) => t.done).length;
    return {
        totalTopLevel,
        completedTopLevel,
        complete: isTaskListComplete(topLevel),
    };
}
//# sourceMappingURL=task.js.map