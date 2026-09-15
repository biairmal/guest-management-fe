"use client";

import React from "react";
import {
  Layout,
  Menu,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
} from "antd";
import {
  DashboardOutlined,
  CalendarOutlined,
  TeamOutlined,
  IdcardOutlined,
  SolutionOutlined,
  FileTextOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  { key: "dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "events", icon: <CalendarOutlined />, label: "Events" },
  { key: "guests", icon: <TeamOutlined />, label: "Guests" },
  { key: "staff", icon: <IdcardOutlined />, label: "Staff" },
  { key: "incidents", icon: <WarningOutlined />, label: "Incidents" },
  { key: "templates", icon: <FileTextOutlined />, label: "Templates" },
  { key: "users", icon: <UserOutlined />, label: "Users" },
  { key: "workflows", icon: <SolutionOutlined />, label: "Workflow steps" },
];

// Sample rows shaped like the per-workflow-step "helicopter view" from REQUIREMENT.md §4.9
const workflowStepColumns = [
  { title: "Step", dataIndex: "step", key: "step" },
  { title: "Completed", dataIndex: "completed", key: "completed" },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: string) => (
      <Tag color={status === "On track" ? "green" : "orange"}>{status}</Tag>
    ),
  },
];

const workflowStepData = [
  { key: 1, step: "Check-in", completed: "312 / 480", status: "On track" },
  { key: 2, step: "Souvenir pickup", completed: "140 / 480", status: "Lagging" },
  { key: 3, step: "Photo booth", completed: "95 / 480", status: "Lagging" },
];

export default function Home() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center" }}>
        <Title level={4} style={{ color: "#fff", margin: 0 }}>
          Guest Management
        </Title>
      </Header>
      <Layout>
        <Sider width={220}>
          <Menu
            mode="inline"
            defaultSelectedKeys={["dashboard"]}
            style={{ height: "100%" }}
            items={menuItems}
          />
        </Sider>
        <Content style={{ padding: 24 }}>
          <Title level={3} style={{ marginTop: 0 }}>
            Summer Gala 2026 — overview
          </Title>

          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic title="Invited" value={480} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="RSVP Confirmed"
                  value={356}
                  styles={{ content: { color: "#3f8600" } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="RSVP Pending"
                  value={98}
                  styles={{ content: { color: "#faad14" } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="RSVP Declined"
                  value={26}
                  styles={{ content: { color: "#cf1322" } }}
                />
              </Card>
            </Col>
          </Row>

          <Card title="Workflow step completion">
            <Table
              columns={workflowStepColumns}
              dataSource={workflowStepData}
              pagination={false}
            />
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
