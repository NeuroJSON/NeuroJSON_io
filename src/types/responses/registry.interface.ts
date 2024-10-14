export interface Registry {
    _id:        string;
    _rev:       string;
    database:   Database[];
    dependency: any[];
}

export interface Database {
    id:          string;
    name:        string;
    fullname?:   string;
    logo?:       string;
    url:         string;
    group?:      number;
    datatype:    string[];
    maintainer?: string[];
    launchdate?: string;
    datasets:    number;
    standard?:   string[];
    support:     string;
}
