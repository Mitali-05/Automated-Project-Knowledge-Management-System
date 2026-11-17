"""Retired local-store prototype: PRISM's web API owns persisted application data."""
import streamlit as st

st.set_page_config(page_title="PRISM", layout="centered")
st.title("PRISM")
st.info("Use the PRISM web frontend for projects, knowledge, reports and chat. "
        "The legacy local-file interface is disabled to prevent a second source of project data.")
st.caption("Run the Spring Boot backend, React frontend and extraction bridge.")
st.stop()
