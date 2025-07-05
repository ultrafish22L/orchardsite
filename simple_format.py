#!/usr/bin/env python3
"""
Simple script to remove **bold** formatting from plant database.
"""

import re
import sys

def clean_text(text):
    """
    Simply remove **bold** patterns and clean up spacing.
    """
    # Remove all **text**: patterns
    result = re.sub(r'\*\*[^*]+\*\*:\s*', '', text)
    
    # Remove any remaining **text** patterns
    result = re.sub(r'\*\*([^*]+)\*\*', r'\1', result)
    
    # Clean up spacing
    result = re.sub(r'\s+', ' ', result)
    result = result.strip()
    
    return result

def process_file(filename):
    """Process the plant database file."""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all text within quotes that contains **
    pattern = r'(general_info|cultivation_tips|pest_management|pruning_guidelines):\s*"([^"]*\*\*[^"]*)"'
    
    def replace_match(match):
        field_name = match.group(1)
        text = match.group(2)
        cleaned = clean_text(text)
        return f'{field_name}: "{cleaned}"'
    
    new_content = re.sub(pattern, replace_match, content)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Processed {filename}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python simple_format.py <filename>")
        sys.exit(1)
    
    process_file(sys.argv[1])