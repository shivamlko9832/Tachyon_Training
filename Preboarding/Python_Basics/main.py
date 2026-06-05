import json
from pathlib import Path

print("Program started")

data_file = Path(__file__).with_name("students.json")

with data_file.open("r", encoding="utf-8") as file:
    data = json.load(file)

print("JSON Loaded:", data)

filtered_students = [student for student in data if student["marks"] > 50]

print("Students scoring above 50:")

for student in filtered_students:
    print(student)  