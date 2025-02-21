# ReaderAI

**ReaderAI** is a speech-to-speech reading assistant powered by DSPy. This project leverages `uv` for dependency management and provides an interactive development workflow using `ipython`.

## 🚀 Quick Start

### 1. Install `uv`
ReaderAI uses [`uv`](https://github.com/astral-sh/uv) for fast and efficient package management.

If you haven't installed `uv` yet, do so with:

```
pip install uv
```

### 2. Clone the Repository

```
git clone https://github.com/yourusername/readerai.git
cd readerai
```

## 📦 Managing Dependencies

### Install Dependencies
To install project dependencies from `requirements.txt`:

```
uv pip install -r requirements.txt
```

### Add a New Dependency
To install a package and add it to `requirements.txt`:

```
uv pip install somepackage
uv pip freeze > requirements.txt
```

## ▶️ Running the Example Script

To verify your setup, run the provided `hello.py` script:

```
python hello.py
```

## 🛠️ Interactive Development with IPython

ReaderAI comes with `ipython` installed for interactive testing.

Start an interactive session with:

```
ipython
```

Then, within the session, you can run:

```
from hello import main
main()
```

## 🧼 Deactivating & Removing the Virtual Environment

To deactivate the environment:

```
deactivate
```

To remove the virtual environment entirely:

```
rm -rf .venv
```

## 🔄 Updating Dependencies

To update all dependencies:

```
uv pip install --upgrade -r requirements.txt
```

## ❓ Troubleshooting

- If `uv` commands fail, ensure you're using the correct Python version.
- If `ipython` is missing, install it with:
  ```
  uv pip install ipython
  ```

## 📜 License

MIT License © 2025 Your Name

