import "./deed.css";
import type { ReactNode } from "react";
import { toBn } from "@/lib/deed/bn";
import { fill, slot } from "@/lib/deed/fill";
import { deedFont } from "@/lib/deed/font";
import type { DeedInput } from "@/lib/deed/schema";
import { getTemplate } from "@/lib/deed/templates";
import type { Block } from "@/lib/deed/templates/types";
import { buildValues } from "@/lib/deed/values";

export function DeedDocument({ data }: { data: DeedInput }) {
  const template = getTemplate(data.deedType);
  const values = buildValues(data);

  return (
    <article className={`deed-paper ${deedFont.className}`}>
      <table className="deed-frame">
        <tbody>
          <tr>
            <td>
              <h1>{template.title}</h1>
              {template.blocks.map((block, i) => (
                <BlockView key={i} block={block} data={data} values={values} />
              ))}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>
              <div className="deed-initials">
                <span>প্রথম পক্ষের সংক্ষিপ্ত স্বাক্ষর: ............</span>
                <span>দ্বিতীয় পক্ষের সংক্ষিপ্ত স্বাক্ষর: ............</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </article>
  );
}

function BlockView({
  block,
  data,
  values,
}: {
  block: Block;
  data: DeedInput;
  values: Record<string, string>;
}): ReactNode {
  switch (block.t) {
    case "h":
      return block.level === 3 ? <h3>{block.text}</h3> : <h2>{block.text}</h2>;

    case "p":
      return <p>{fill(block.text, values)}</p>;

    case "kv":
      return (
        <table className="deed-grid">
          {block.head && (
            <thead>
              <tr>
                <th>{block.head[0]}</th>
                <th>{block.head[1]}</th>
              </tr>
            </thead>
          )}
          <tbody>
            {block.rows.map(([label, text]) => (
              <tr key={label}>
                <td className="deed-key">{label}</td>
                <td>{fill(text, values)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "table":
      return (
        <table className="deed-grid">
          <thead>
            <tr>
              {block.head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>{fill(cell, values)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "owners":
      return (
        <table className="deed-grid">
          <thead>
            <tr>
              <th>ক্রম</th>
              <th>নাম</th>
              <th>পিতার নাম</th>
              <th>মোবাইল</th>
            </tr>
          </thead>
          <tbody>
            {data.owners.map((o, i) => (
              <tr key={i}>
                <td>{toBn(i + 1)}</td>
                <td>{slot(o.name, 18)}</td>
                <td>{slot(o.father, 16)}</td>
                <td>{slot(o.mobile ? toBn(o.mobile) : "", 12)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "ownerSigs":
      return (
        <div className="deed-sig">
          <p>
            <strong>প্রথম পক্ষের স্বাক্ষর</strong>
          </p>
          {data.owners.map((o, i) => (
            <p key={i}>
              {toBn(i + 1)}. {slot("", 22)} ({slot(o.name, 20)}) তারিখ:{" "}
              {slot("", 10)}
            </p>
          ))}
        </div>
      );

    case "tenantSig":
      return (
        <div className="deed-sig">
          <p>
            <strong>দ্বিতীয় পক্ষের স্বাক্ষর ও টিপসই</strong>
          </p>
          <p>
            {slot("", 22)} ({slot(data.tenant.name, 20)}) তারিখ: {slot("", 10)}
          </p>
          <p>
            বাম হাতের বৃদ্ধাঙ্গুলির ছাপ: <span className="deed-thumb" />
          </p>
        </div>
      );

    case "witnesses":
      return (
        <div className="deed-sig">
          <p>
            <strong>সাক্ষীগণের স্বাক্ষর</strong>
          </p>
          {Array.from({ length: block.count }, (_, i) => (
            <p key={i}>
              {toBn(i + 1)}. নাম: {slot("", 18)} পিতা: {slot("", 16)}
              <br />
              ঠিকানা: {slot("", 40)}
              <br />
              জাতীয় পরিচয়পত্র নং: {slot("", 14)} মোবাইল: {slot("", 12)}{" "}
              স্বাক্ষর: {slot("", 14)}
            </p>
          ))}
        </div>
      );
  }
}
