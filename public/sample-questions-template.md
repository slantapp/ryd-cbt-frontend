# Sample Questions Bulk Upload Template

## Excel File Format

Create an Excel file (.xlsx or .xls) with the following columns:

| questionText | questionType | options | correctAnswer | points |
|--------------|-------------|---------|---------------|--------|
| What is 2+2? | multiple_choice | {"A": "3", "B": "4", "C": "5", "D": "6"} | B | 1.0 |
| Is the sky blue? | true_false | null | true | 1.0 |
| Explain photosynthesis | short_answer | null | (any answer accepted) | 2.0 |

## Column Descriptions

- **questionText**: The question text (required)
- **questionType**: Type of question - "multiple_choice", "true_false", or "short_answer" (required)
- **options**: For multiple choice questions, JSON object with options like `{"A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4"}`. Leave empty for true/false or short answer.
- **correctAnswer**: The correct answer. For multiple choice, use the option key (A, B, C, D). For true/false, use "true" or "false". For short answer, any value (not used for grading).
- **points**: Points for this question (default: 1.0)

## Examples

### Multiple Choice
```
questionText: "What is the capital of France?"
questionType: "multiple_choice"
options: {"A": "London", "B": "Berlin", "C": "Paris", "D": "Madrid"}
correctAnswer: "C"
points: 1.0
```

### True/False
```
questionText: "The Earth is round."
questionType: "true_false"
options: (leave empty or null)
correctAnswer: "true"
points: 1.0
```

### Short Answer
```
questionText: "Explain the water cycle."
questionType: "short_answer"
options: (leave empty or null)
correctAnswer: (any value, not used for grading)
points: 2.0
```

