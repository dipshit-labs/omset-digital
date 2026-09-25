"use client";

import {
  Button,
  FieldLabel,
  TextInput,
  useField,
  useForm,
  useFormFields,
} from "@payloadcms/ui";
import type { TextFieldClientProps } from "payload";
import { slugify } from "payload/shared";
import type React from "react";
import { useCallback, useEffect } from "react";

import "./styles.css";

type SlugComponentProps = {
  checkboxFieldPath: string;
  fieldToUse: string;
} & TextFieldClientProps;

const SlugComponent: React.FC<SlugComponentProps> = ({
  checkboxFieldPath: checkboxFieldPathFromProps,
  field,
  fieldToUse,
  path,
  readOnly: readOnlyFromProps,
}) => {
  const { label } = field;

  const prefix = path?.includes(".")
    ? path.slice(0, path.lastIndexOf(".") + 1)
    : "";

  const checkboxFieldPath = `${prefix}${checkboxFieldPathFromProps}`;
  const targetFieldPath = `${prefix}${fieldToUse}`;

  const { setValue, value } = useField<string>({ path: path || field.name });

  const { dispatchFields } = useForm();

  // The value of the checkbox (slugLock)
  // SAFETY: checkboxFieldPath points to a checkbox field whose form value is boolean | undefined.
  const checkboxValue = useFormFields(
    ([fields]) => fields[checkboxFieldPath]?.value as boolean | undefined
  );

  // The value of the field we're listening to for the slug
  // SAFETY: targetFieldPath points to a text/title field whose form value is string | undefined.
  const targetFieldValue = useFormFields(
    ([fields]) => fields[targetFieldPath]?.value as string | undefined
  );

  const isLocked = Boolean(checkboxValue ?? true);

  useEffect(() => {
    if (isLocked) {
      if (targetFieldValue) {
        const formattedSlug = slugify(targetFieldValue);

        if (value !== formattedSlug) {
          setValue(formattedSlug);
        }
      } else if (value !== "") {
        setValue("");
      }
    }
  }, [targetFieldValue, isLocked, setValue, value]);

  const handleLock = useCallback(
    (e: React.MouseEvent<Element>) => {
      e.preventDefault();

      dispatchFields({
        path: checkboxFieldPath,
        type: "UPDATE",
        value: !isLocked,
      });
    },
    [isLocked, checkboxFieldPath, dispatchFields]
  );

  const readOnly = readOnlyFromProps || isLocked;

  return (
    <div className="field-type slug-field-component">
      <div className="label-wrapper">
        <FieldLabel htmlFor={`field-${path}`} label={label} />

        <Button buttonStyle="none" className="lock-button" onClick={handleLock}>
          {isLocked ? "Unlock" : "Lock"}
        </Button>
      </div>

      <TextInput
        onChange={setValue}
        path={path || field.name}
        readOnly={Boolean(readOnly)}
        value={value}
      />
    </div>
  );
};

export { SlugComponent };
