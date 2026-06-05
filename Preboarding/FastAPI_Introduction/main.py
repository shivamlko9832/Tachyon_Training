from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


class Student(BaseModel):
    name: str
    marks: int


app = FastAPI(title="FastAPI Introduction Demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

students: list[Student] = [
    Student(name="Shivam", marks=95),
    Student(name="Rahul", marks=88),
    Student(name="Aman", marks=76),
    Student(name="Priya", marks=91),
    Student(name="Sneha", marks=84),
]


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "FastAPI Introduction Demo is running",
        "docs": "/docs",
        "health": "/health",
        "students": "/students",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/students")
def get_students() -> list[Student]:
    return students


@app.post("/students")
def create_student(student: Student) -> dict[str, object]:
    students.append(student)
    return {"message": "Student added", "student": student}


@app.put("/students/{student_id}")
def update_student(student_id: int, student: Student) -> dict[str, object]:
    if 0 <= student_id < len(students):
        students[student_id] = student
        return {"message": "Student updated", "student": student}
    return {"message": "Student not found"}


@app.delete("/students/{student_id}")
def delete_student(student_id: int) -> dict[str, str]:
    if 0 <= student_id < len(students):
        deleted = students.pop(student_id)
        return {"message": "Student deleted", "student": deleted.name}
    return {"message": "Student not found"}
