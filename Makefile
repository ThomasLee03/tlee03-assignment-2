# Define virtual environment and entry script
VENV = venv
SCRIPT = app.py

# Windows-specific paths
ifeq ($(OS),Windows_NT)
	PYTHON = python
	PIP = $(VENV)\Scripts\pip.exe
	RUN_PYTHON = $(VENV)\Scripts\python.exe
else
	PYTHON = python3
	PIP = $(VENV)/bin/pip
	RUN_PYTHON = $(VENV)/bin/python
endif

# Install dependencies
install:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install -r requirements.txt

# Run the application locally
run:
	$(RUN_PYTHON) $(SCRIPT)

# Clean the environment
clean:
	rm -rf $(VENV)

# Reinstall all dependencies
reinstall: clean install
