import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Card, Drawer, Form, InputNumber, Select } from 'antd';
import type { TableProps } from 'antd';
import { Filter, Search } from 'lucide-react';
import axios from 'axios';
import { TableData, FilterParams } from '../types/data';

const { Option } = Select;

const DataTable: React.FC = () => {
  const [data, setData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const fetchData = async (
    page: number,
    pageSize: number,
    sorter?: TableProps<TableData>['sortOrder'],
    filters?: FilterParams
  ) => {
    setLoading(true);
    try {
      const response = await axios.get(
        'https://docs.google.com/spreadsheets/d/1vwc803C8MwWBMc7ntCre3zJ5xZtG881HKkxlIrwwxNs/gviz/tq?sheet=Sheet1&range=A1:I36592'
      );
      
      // Extract the JSON from the response (remove the callback wrapper)
      const jsonStr = response.data.substring(
        response.data.indexOf('{'),
        response.data.lastIndexOf('}') + 1
      );
      const jsonData = JSON.parse(jsonStr);

      // Transform the data
      let transformedData: TableData[] = jsonData.table.rows.map((row: any) => ({
        domain: row.c[0]?.v || '',
        niche1: row.c[1]?.v || '',
        niche2: row.c[2]?.v || '',
        traffic: row.c[3]?.v || 0,
        dr: row.c[4]?.v || 0,
        da: row.c[5]?.v || 0,
        language: row.c[6]?.v || '',
        price: row.c[7]?.v || 0,
        spamScore: row.c[8]?.v || 0,
      }));

      // Apply filters
      if (filters) {
        transformedData = transformedData.filter((item) => {
          let match = true;
          if (filters.domain) {
            match = match && item.domain.toLowerCase().includes(filters.domain.toLowerCase());
          }
          if (filters.niche1) {
            match = match && item.niche1 === filters.niche1;
          }
          if (filters.language) {
            match = match && item.language === filters.language;
          }
          if (filters.trafficMin !== undefined) {
            match = match && item.traffic >= filters.trafficMin;
          }
          if (filters.trafficMax !== undefined) {
            match = match && item.traffic <= filters.trafficMax;
          }
          // Add other filter conditions as needed
          return match;
        });
      }

      // Apply search
      if (searchText) {
        transformedData = transformedData.filter(item =>
          item.domain.toLowerCase().includes(searchText.toLowerCase())
        );
      }

      // Calculate pagination
      const total = transformedData.length;
      const start = (page - 1) * pageSize;
      const paginatedData = transformedData.slice(start, start + pageSize);

      setData(paginatedData);
      setPagination({
        ...pagination,
        total,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(pagination.current, pagination.pageSize, undefined, filters);
  }, [searchText, filters]);

  const columns = [
    {
      title: 'Domain',
      dataIndex: 'domain',
      sorter: (a: TableData, b: TableData) => a.domain.localeCompare(b.domain),
    },
    {
      title: 'Niche 1',
      dataIndex: 'niche1',
      sorter: (a: TableData, b: TableData) => a.niche1.localeCompare(b.niche1),
    },
    {
      title: 'Niche 2',
      dataIndex: 'niche2',
      sorter: (a: TableData, b: TableData) => a.niche2.localeCompare(b.niche2),
    },
    {
      title: 'Traffic',
      dataIndex: 'traffic',
      sorter: (a: TableData, b: TableData) => a.traffic - b.traffic,
    },
    {
      title: 'DR',
      dataIndex: 'dr',
      sorter: (a: TableData, b: TableData) => a.dr - b.dr,
    },
    {
      title: 'DA',
      dataIndex: 'da',
      sorter: (a: TableData, b: TableData) => a.da - b.da,
    },
    {
      title: 'Language',
      dataIndex: 'language',
      sorter: (a: TableData, b: TableData) => a.language.localeCompare(b.language),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      render: (price: number) => `$${price.toFixed(2)}`,
      sorter: (a: TableData, b: TableData) => a.price - b.price,
    },
    {
      title: 'Spam Score',
      dataIndex: 'spamScore',
      render: (score: number) => `${(score * 100).toFixed(0)}%`,
      sorter: (a: TableData, b: TableData) => a.spamScore - b.spamScore,
    },
  ];

  const handleTableChange: TableProps<TableData>['onChange'] = (
    pagination,
    filters,
    sorter
  ) => {
    fetchData(pagination.current!, pagination.pageSize!, sorter, filters as any);
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
              onChange={(e) => setSearchText(e.target.value)}
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
          pagination={pagination}
          onChange={handleTableChange}
          loading={loading}
          scroll={{ x: true }}
        />
      </Card>

      <Drawer
        title="Filter Data"
        placement="right"
        onClose={() => setFilterDrawerVisible(false)}
        visible={filterDrawerVisible}
        width={320}
      >
        <Form layout="vertical" onFinish={(values) => {
          setFilters(values);
          setFilterDrawerVisible(false);
        }}>
          <Form.Item name="niche1" label="Niche 1">
            <Select allowClear>
              <Option value="Business">Business</Option>
              <Option value="Technology">Technology</Option>
              <Option value="Health">Health</Option>
              {/* Add more options based on your data */}
            </Select>
          </Form.Item>

          <Form.Item name="language" label="Language">
            <Select allowClear>
              <Option value="English">English</Option>
              <Option value="Spanish">Spanish</Option>
              {/* Add more languages */}
            </Select>
          </Form.Item>

          <Form.Item label="Traffic Range">
            <Input.Group compact>
              <Form.Item name="trafficMin" noStyle>
                <InputNumber placeholder="Min" style={{ width: '50%' }} />
              </Form.Item>
              <Form.Item name="trafficMax" noStyle>
                <InputNumber placeholder="Max" style={{ width: '50%' }} />
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <Form.Item label="Price Range">
            <Input.Group compact>
              <Form.Item name="priceMin" noStyle>
                <InputNumber
                  placeholder="Min"
                  style={{ width: '50%' }}
                  prefix="$"
                />
              </Form.Item>
              <Form.Item name="priceMax" noStyle>
                <InputNumber
                  placeholder="Max"
                  style={{ width: '50%' }}
                  prefix="$"
                />
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <div className="flex gap-2">
            <Button onClick={() => {
              setFilters({});
              setFilterDrawerVisible(false);
            }}>
              Reset
            </Button>
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