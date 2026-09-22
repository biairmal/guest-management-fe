"use client";

import React, { useEffect } from "react";
import { Checkbox, Form, Input, Modal } from "antd";

export type StepValues = { name: string; allowsMultiple: boolean };

type Props = {
  open: boolean;
  initial?: StepValues; // set when editing
  position: number; // 1-based position a new step gets
  onCancel: () => void;
  onOk: (values: StepValues) => void; // updates the draft only
};

export default function StepModal({ open, initial, position, onCancel, onOk }: Props) {
  const [form] = Form.useForm<StepValues>();
  const editing = !!initial;

  useEffect(() => {
    if (open) form.setFieldsValue(initial ?? { name: "", allowsMultiple: false });
  }, [open, initial, form]);

  return (
    <Modal
      title={editing ? "Edit workflow step" : "Add workflow step"}
      open={open}
      okText={editing ? "Save" : "Add step"}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark
        onFinish={(v) => onOk({ name: v.name.trim(), allowsMultiple: !!v.allowsMultiple })}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="name"
          label="Step name"
          rules={[{ required: true, whitespace: true, message: "Enter a step name." }]}
          extra={editing ? undefined : `Added as step ${position}. It’s saved when you save the category.`}
        >
          <Input autoFocus maxLength={200} />
        </Form.Item>
        <Form.Item
          name="allowsMultiple"
          valuePropName="checked"
          extra="For stations like a photo booth or buffet. Every scan is counted."
          style={{ marginBottom: 0 }}
        >
          <Checkbox>Guests can do this step more than once</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
