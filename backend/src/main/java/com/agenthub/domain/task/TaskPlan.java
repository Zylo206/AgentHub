package com.agenthub.domain.task;

import java.util.List;

public class TaskPlan {

    private final String goal;
    private final List<TaskStep> steps;

    public TaskPlan(String goal, List<TaskStep> steps) {
        this.goal = goal;
        this.steps = List.copyOf(steps);
    }

    public String getGoal() {
        return goal;
    }

    public List<TaskStep> getSteps() {
        return steps;
    }
}
