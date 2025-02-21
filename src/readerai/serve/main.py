from fastapi import FastAPI
import uvicorn
from pydantic import BaseModel
import os
from dotenv import load_dotenv

import dspy

load_dotenv()

lm = dspy.LM('gemini/gemini-2.0-flash-001', api_key="")
dspy.configure(lm=lm)

def cot(q):
    math = dspy.ChainOfThought("question -> answer: float")
    resp = math(question=q)
    return resp


class Item(BaseModel):
    name: str
    description: str | None = None

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/greeting/{name}")
async def root(name: str):
    return {"message": f"Hello {name}"}

@app.post("/items/")
async def print_item(item: Item):
    return cot(item.description)

def main():
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, use_colors=True, loop="auto")

if __name__ == "__main__":
    main()