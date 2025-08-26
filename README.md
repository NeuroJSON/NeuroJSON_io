# NeuroJSON.io

**Free Data Worth Sharing**

[![Website](https://img.shields.io/badge/website-NeuroJSON.io-blue)](https://neurojson.io)  
[![FAIR](https://img.shields.io/badge/FAIR-Findable%2C%20Accessible%2C%20Interoperable%2C%20Reusable-purple)](#)

---

## 📖 Overview

[NeuroJSON.io](https://neurojson.io) is an **NIH-funded open data portal** for **neuroimaging datasets**, designed to make scientific data:

- **Findable**: Fully searchable metadata and datasets
- **Accessible**: Open, lightweight JSON format
- **Interoperable**: Compatible across platforms and programming languages
- **Reusable**: Rich metadata, visualizations, and long-term viability

NeuroJSON leverages **modern web technologies and scalable NoSQL databases** and the **JSON standard** to distribute large-scale, complex imaging data in a **human- and machine-readable** form.

---

## 🚀 Features

- **Search** — Browse across multiple databases, datasets, and modalities
- **Preview** — Interact with JSON metadata and visualize imaging data (2D/3D) in browser
- **Download** — Retrieve datasets in JSON format, ready for use in Python, MATLAB/Octave, C++, and more
- **Upload** - Contribute your own datasets to NeuroJSON.io ([Steps to contribute](#-for-data-contributors))
- **REST API** — Automate your workflows with lightweight endpoints, designed for smooth integration into both local analyses and large-scale pipelines

---

## 🏁 Getting Started

1. Visit [https://neurojson.io](https://neurojson.io)
2. Use the **search page** to find datasets or subjects of interest
3. Click any dataset to **preview** or **download** data
4. For automation, use the **[REST API](#rest-api)**

---

## 👩‍🔬 For Data Contributors

We welcome your datasets!

- NeuroJSON prefers **BIDS-compliant data**
- Convert datasets to JSON using [`NeuroJSON Client(neuroj)`](https://github.com/NeuroJSON/neuroj):
  - Install Docker (skip this step if you already have it): [Get Docker](https://docs.docker.com/get-docker/)
  - Download neuroj via docker:
    ```
    docker pull openjdata/neuroj:v2025
    ```
  - Example (convert a single dataset to JSON via neuroj):
    ```
    docker run openjdata/neuroj:v2025 neuroj -i /path/to/database/rootfolder -o /path/to/output/json/folder -db openneuro -ds ds000001 --convert
    ```
  - See the full list of available [NeuroJSON Client commands](https://hub.docker.com/r/openjdata/neuroj)
  - Watch our [`tutorial video - convert data`](https://neurojson.io/about)

### Steps to contribute

1. Download NeuroJSON Client (neuroj)
2. Convert your dataset to JSON
3. Validate metadata
4. [Open a ticket](https://github.com/NeuroJSON/registry) to upload your dataset

Contributions ensure **long-term public availability and reusability**.

---

## 💻 For Developers

### REST API

- Lightweight endpoints for download
- JSON responses designed for integration with cloud and local workflows

Example (Load by URL with REST-API in Python):

```
pip install jdata bjdata numpy
```

```
import jdata as jd
data = jd.loadurl('https://neurojson.io:7777/openneuro/ds000001')

# List all externally linked files
links = jd.jsonpath(data, '$.._DataLink_')

# Download & cache anatomical nii.gz data for sub-01/sub-02
jd.jdlink(links, {'regex': 'anat/sub-0[12]_.*.nii'})
```

---

## 📊 Current Stats (as of latest release)

| Metric    | Value       |
| --------- | ----------- |
| Databases | **22**      |
| Datasets  | **1,529**   |
| Subjects  | **58,026**  |
| Links     | **580,857** |
| Data Size | **38 TB**   |

---

## 🤝 Governance & Support

- NIH-funded data dissemination service
- Maintained by the [COTI Lab, Northeastern University](http://fanglab.org/wiki/)
- Contact: **admin@neurojson.io**

---

## 🛠 Roadmap

We’re continuing to grow NeuroJSON.io to better serve the community. Some of the upcoming directions include:

- 🔜 **Expanding databases and datasets** — broadening coverage to include more sources and subjects
- 🔜 **Enhancing visualization** — improving 2D/3D previews for richer and more intuitive exploration of data
- 🔜 **Streamlining uploads** — introducing new features to make dataset contributions more automatic and user-friendly
