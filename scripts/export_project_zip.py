#!/usr/bin/env python3
import os
import zipfile
import sys

def make_source_zip(output_path="source_code_thcs_le_huu_lap.zip"):
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    exclude_dirs = {"node_modules", ".git", "dist", ".aistudio"}
    exclude_files = {output_path, "test.zip"}

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file in exclude_files or file.endswith(".zip"):
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, root_dir)
                zipf.write(file_path, arcname)
    print(f"Source package created at: {output_path}")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "source_code_thcs_le_huu_lap.zip"
    make_source_zip(out)
