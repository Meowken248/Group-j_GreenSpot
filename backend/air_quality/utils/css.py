import os
import streamlit as st


def inject_css(css_path: str = "styles/main.css"):
    if not os.path.isabs(css_path):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        candidate = os.path.join(base_dir, css_path)
        if os.path.exists(candidate):
            css_path = candidate
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
    st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)
