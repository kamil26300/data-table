import React, { useState, useEffect } from "react";
import {
  Table,
  Input,
  Button,
  Card,
  Drawer,
  Form,
  InputNumber,
  Select,
} from "antd";
import type { TableProps } from "antd";
import { Filter, Search } from "lucide-react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

interface TableData {
  [key: string]: any;
}

interface FilterParams {
  [key: string]: any;
}

const removeDuplicateDomains = (data: TableData[]) => {
  const uniqueDomains = new Map();
  return data.filter((item) => {
    if (item.domain && !uniqueDomains.has(item.domain)) {
      uniqueDomains.set(item.domain, true);
      return true;
    }
    return false;
  });
};

const DataTable: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm();

  const [data, setData] = useState<TableData[]>([]);
  const [allData, setAllData] = useState<TableData[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({});
  const [searchText, setSearchText] = useState("");
  const [sortInfo, setSortInfo] = useState<{
    field: string;
    order: "ascend" | "descend" | undefined;
  }>({
    field: "",
    order: undefined,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Initialize states from URL parameters
  const initializeFromURL = () => {
    const newFilters: FilterParams = {};
    const newPagination = {
      current: 1,
      pageSize: 20,
      total: 0,
    };
    const newSortInfo = {
      field: "",
      order: undefined as "ascend" | "descend" | undefined,
    };
    let newSearchText = "";

    searchParams.forEach((value, key) => {
      switch (key) {
        case "sortField":
          newSortInfo.field = value;
          break;
        case "sortOrder":
          newSortInfo.order = value as "ascend" | "descend";
          break;
        case "page":
          newPagination.current = Number(value);
          break;
        case "pageSize":
          newPagination.pageSize = Number(value);
          break;
        case "searchText":
          newSearchText = value;
          break;
        default:
          if (value) {
            newFilters[key] = value;
          }
      }
    });

    setFilters(newFilters);
    setPagination(newPagination);
    setSortInfo(newSortInfo);
    setSearchText(newSearchText);
    form.setFieldsValue(newFilters);

    return { newFilters, newPagination, newSortInfo, newSearchText };
  };

  const getUniqueValues = (field: string) => {
    return [...new Set(allData.map((item) => item[field]))].filter(Boolean);
  };

  const updateURL = (
    newFilters: FilterParams,
    newPagination: typeof pagination,
    newSearchText?: string,
    newSortInfo?: typeof sortInfo
  ) => {
    const params = new URLSearchParams();

    // Update pagination params
    params.set("page", newPagination.current.toString());
    params.set("pageSize", newPagination.pageSize.toString());

    // Update filters
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value.toString());
      }
    });

    // Update search text
    if (newSearchText) {
      params.set("searchText", newSearchText);
    }

    // Update sort information
    if (newSortInfo?.field) {
      params.set("sortField", newSortInfo.field);
      if (newSortInfo.order) {
        params.set("sortOrder", newSortInfo.order);
      }
    }

    setSearchParams(params);
  };

  const applyDataTransformations = (
    sourceData: TableData[],
    currentFilters: FilterParams,
    currentSearchText: string,
    currentSortInfo: typeof sortInfo
  ) => {
    let result = [...sourceData];

    // Apply filters
    if (Object.keys(currentFilters).length > 0) {
      result = result.filter((item) => {
        return Object.keys(currentFilters).every((key) => {
          let filterValue = currentFilters[key];
          if (key.includes("spamscore")) filterValue /= 100;
          if (!filterValue) return true;

          // Helper function to clean and convert the value
          const parseNumber = (value: string) => {
            const cleanedValue = value?.toString().replace(/[^\d.-]/g, ""); // Remove commas and spaces
            return parseFloat(cleanedValue);
          };

          if (key.includes("Min")) {
            const field = key.replace("Min", "");
            const itemValue = parseNumber(item[field]);
            return !isNaN(itemValue) && itemValue >= filterValue;
          }

          if (key.includes("Max")) {
            const field = key.replace("Max", "");
            const itemValue = parseNumber(item[field]);
            return !isNaN(itemValue) && itemValue <= filterValue;
          }

          if (!isNaN(parseNumber(item[key]))) {
            const itemValue = parseNumber(item[key]);
            return itemValue === filterValue;
          }

          return item[key]
            ?.toString()
            .toLowerCase()
            .includes(filterValue.toString().toLowerCase());
        });
      });
    }

    // Apply search
    if (currentSearchText) {
      result = result.filter((item) =>
        item.domain.toLowerCase().includes(currentSearchText.toLowerCase())
      );
    }

    // Apply sorting
    if (currentSortInfo.field && currentSortInfo.order) {
      result.sort((a, b) => {
        const aVal = a[currentSortInfo.field];
        const bVal = b[currentSortInfo.field];
        const modifier = currentSortInfo.order === "ascend" ? 1 : -1;

        if (typeof aVal === "string") {
          return aVal.localeCompare(bVal) * modifier;
        }
        return (aVal - bVal) * modifier;
      });
    }

    return result;
  };

  // Initialize from URL and fetch data on mount
  useEffect(() => {
    const { newFilters, newPagination, newSortInfo, newSearchText } =
      initializeFromURL();

    // Fetch and process data after initializing states
    fetchAndProcessData(newFilters, newSearchText, newSortInfo, newPagination);
  }, []);

  // Fetch and process data
  const fetchAndProcessData = async (
    currentFilters = filters,
    currentSearchText = searchText,
    currentSortInfo = sortInfo,
    currentPagination = pagination
  ) => {
    setLoading(true);
    try {
      const response = await axios.get(
        "https://docs.google.com/spreadsheets/d/1vwc803C8MwWBMc7ntCre3zJ5xZtG881HKkxlIrwwxNs/gviz/tq?sheet=Sheet1&range=A1:I36592"
      );

      const jsonStr = response.data.substring(
        response.data.indexOf("{"),
        response.data.lastIndexOf("}") + 1
      );
      const jsonData = JSON.parse(jsonStr);

      // Create columns
      const dynamicColumns = jsonData.table.cols.map((col: any) => {
        const column: any = {
          title: col.label,
          dataIndex: col.label.toLowerCase().replace(/\s+/g, ""),
          sorter: true,
        };

        if (col.pattern === '"$"#,##0.00') {
          column.render = (value: number) => `$${value?.toFixed(2)}`;
        } else if (col.pattern === "0%") {
          column.render = (value: number) => `${(value * 100)?.toFixed(0)}%`;
        } else if (col.type === "number") {
          column.render = (value: number) => value?.toLocaleString() || 0;
        }

        return column;
      });

      setColumns(dynamicColumns);

      // Transform data
      let transformedData: TableData[] = jsonData.table.rows.map((row: any) => {
        const rowData: TableData = {};
        jsonData.table.cols.forEach((col: any, index: number) => {
          const key = col.label.toLowerCase().replace(/\s+/g, "");
          rowData[key] = row.c[index]?.v ?? null;
        });
        return rowData;
      });

      transformedData = removeDuplicateDomains(transformedData);
      setAllData(transformedData);

      // Process data with the passed filters
      const processedData = applyDataTransformations(
        transformedData,
        currentFilters,
        currentSearchText,
        currentSortInfo
      );

      // Update pagination and data
      const start =
        (currentPagination.current - 1) * currentPagination.pageSize;
      const paginatedData = processedData.slice(
        start,
        start + currentPagination.pageSize
      );

      setData(paginatedData);
      setPagination((prev) => ({
        ...prev,
        current: currentPagination.current,
        pageSize: currentPagination.pageSize,
        total: processedData.length,
      }));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Process data when filters/search/sort/pagination change
  useEffect(() => {
    if (allData.length > 0) {
      const processedData = applyDataTransformations(
        allData,
        filters,
        searchText,
        sortInfo
      );
      const start = (pagination.current - 1) * pagination.pageSize;
      const paginatedData = processedData.slice(
        start,
        start + pagination.pageSize
      );

      setData(paginatedData);
      setPagination((prev) => ({
        ...prev,
        total: processedData.length,
      }));
    }
  }, [filters, searchText, sortInfo, pagination.current, pagination.pageSize]);

  const handleReset = () => {
    const fields = form.getFieldsValue() as Record<string, any>;

    // Set all fields to empty string
    const emptyFields = Object.keys(fields).reduce((acc, key) => {
      acc[key] = ""; // Set each field to an empty string
      return acc;
    }, {} as Record<string, any>);

    // Reset fields to empty values
    form.setFieldsValue(emptyFields);
    setFilters({});
    setSearchText("");
    setSortInfo({ field: "", order: undefined });
    setPagination({
      current: 1,
      pageSize: 20,
      total: 0,
    });
    setSearchParams(new URLSearchParams());
    setFilterDrawerVisible(false);
  };

  const handleTableChange: TableProps<TableData>["onChange"] = (
    newPagination,
    _,
    sorter: any
  ) => {
    const newSortInfo = {
      field: sorter.field,
      order: sorter.order,
    };

    setSortInfo(newSortInfo);
    setPagination({
      ...pagination,
      current: newPagination.current || 1,
      pageSize: newPagination.pageSize || 20,
    });

    updateURL(
      filters,
      {
        ...pagination,
        current: newPagination.current || 1,
        pageSize: newPagination.pageSize || 20,
      },
      searchText,
      newSortInfo
    );
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
    updateURL(filters, { ...pagination, current: 1 }, value, sortInfo);
  };

  const handleFiltersSubmit = (values: FilterParams) => {
    setFilters(values);
    setPagination((prev) => ({ ...prev, current: 1 }));
    updateURL(values, { ...pagination, current: 1 }, searchText, sortInfo);
    setFilterDrawerVisible(false);
  };

  return (
    <div className="p-4">
      <Card className="mb-4">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <Input
              placeholder="Search by domain name..."
              prefix={<Search className="h-5 w-5 text-gray-400" />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Button
            type="primary"
            icon={<Filter className="h-4 w-4" />}
            onClick={() => setFilterDrawerVisible(true)}
            className="bg-blue-600"
          >
            Filters
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="domain"
          pagination={{
            ...pagination,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
          loading={loading}
          scroll={{ x: true }}
        />
      </Card>

      <Drawer
        title="Filter Data"
        placement="right"
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
        width={320}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFiltersSubmit}
          initialValues={filters}
        >
          {columns.map((column) => {
            const fieldName = column.dataIndex;
            if (["niche1", "niche2", "language"].includes(fieldName)) {
              return (
                <Form.Item
                  key={fieldName}
                  name={fieldName}
                  label={column.title}
                >
                  <Select allowClear>
                    {getUniqueValues(fieldName).map((value) => (
                      <Select.Option key={value} value={value}>
                        {value}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            }
            return null;
          })}

          <Form.Item label="Traffic Range">
            <Input.Group compact>
              <Form.Item name="trafficMin" noStyle>
                <InputNumber placeholder="Min" style={{ width: "50%" }} />
              </Form.Item>
              <Form.Item name="trafficMax" noStyle>
                <InputNumber placeholder="Max" style={{ width: "50%" }} />
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <Form.Item label="Price Range">
            <Input.Group compact>
              <Form.Item name="priceMin" noStyle>
                <InputNumber
                  placeholder="Min"
                  style={{ width: "50%" }}
                  prefix="$"
                />
              </Form.Item>
              <Form.Item name="priceMax" noStyle>
                <InputNumber
                  placeholder="Max"
                  style={{ width: "50%" }}
                  prefix="$"
                />
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <Form.Item label="Spam Score">
            <Input.Group compact>
              <Form.Item name="spamscoreMin" noStyle>
                <InputNumber
                  placeholder="Min"
                  style={{ width: "50%" }}
                  suffix="%"
                />
              </Form.Item>
              <Form.Item name="spamscoreMax" noStyle>
                <InputNumber
                  placeholder="Max"
                  style={{ width: "50%" }}
                  suffix="%"
                />
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <div className="flex gap-2">
            <Button onClick={handleReset}>Reset</Button>
            <Button type="primary" htmlType="submit" className="bg-blue-600">
              Apply Filters
            </Button>
          </div>
        </Form>
      </Drawer>
    </div>
  );
};

export default DataTable;
