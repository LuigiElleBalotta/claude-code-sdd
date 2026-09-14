export function summarize(spec) {
    const topLevel = spec.tasks.topLevel;
    return {
        identity: spec.identity,
        title: spec.title,
        status: spec.status,
        totalTopLevelTasks: topLevel.length,
        completedTopLevelTasks: topLevel.filter((t) => t.done).length,
    };
}
//# sourceMappingURL=specification.js.map