"use client";

import React, { useEffect } from "react";
import { Form, Input, Modal } from "antd";
import { sameName } from "../../../../_lib/categories";

type Props = {
  open: boolean;
  initialName?: string; // set when renaming
  takenNames: string[]; // the other ticket types' names
  onCancel: () => void;
  onOk: (name: string) => void; // updates the draft only
};

export default function TicketTypeModal({ open, initialName, takenNames, onCancel, onOk }: Props) {
  const [form] = Form.useForm<{ name: string }>();
  const renaming = initialName !== undefined;

  useEffect(() => {
    if (open) form.setFieldsValue({ name: initialName ?? "" });
  }, [open, initialName, form]);

  return (
    <Modal
      title={renaming ? "Rename ticket type" : "Add ticket type"}
      open={open}
      okText={renaming ? "Save" : "Add ticket type"}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={(v) => onOk(v.name.trim())} style={{ marginTop: 16 }}>
        <Form.Item
          name="name"
          label="Ticket type name"
          extra={renaming ? undefined : "It starts with every step included. Adjust it in Step access."}
          rules={[
            { required: true, whitespace: true, message: "Enter a ticket type name." },
            {
              validator: (_, value: string = "") => {
                const taken = takenNames.find((n) => sameName(n, value));
                return taken
                  ? Promise.reject(new Error(`This category already has a ticket type called ${taken}.`))
                  : Promise.resolve();
              },
            },
          ]}
          style={{ marginBottom: 0 }}
        >
          <Input autoFocus maxLength={200} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
