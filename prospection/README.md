# Prospection forum

    pip install -r requirements.txt
    export PYTHONPATH=src
    python -m prospection --fetch-catalogue      # one page request, only if robots.txt allows
    python -m prospection --limit 5              # trial run
    python -m prospection                        # full run
    pytest

Place a manually saved page at `input/catalogue.html` to avoid any request to the catalogue host.
CSS selectors in `config/config.yaml` (section `parser`) must be validated against the real HTML.
