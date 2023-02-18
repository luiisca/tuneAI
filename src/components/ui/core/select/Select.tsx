import { cn } from "@/utils/cn";
import * as React from "react";
import {
  components as reactSelectComponents,
  GroupBase,
  SelectComponentsConfig,
  ControlProps,
} from "react-select";
import AsyncSelect, { AsyncProps } from "react-select/async";

import {
  ControlComponent,
  InputComponent,
  MenuComponent,
  MenuListComponent,
  OptionComponent,
  SingleValueComponent,
  ValueContainerComponent,
  MultiValueComponent,
} from "./components";

export type AsyncSelectProps<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
> = AsyncProps<Option, IsMulti, Group>;

export const getReactSelectProps = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  components,
  unstyledControl,
}: {
  className?: string;
  components: SelectComponentsConfig<Option, IsMulti, Group>;
  unstyledControl?: boolean;
}) => ({
  className: cn("block h-[36px] w-full min-w-0 flex-1 rounded-md", className),
  classNamePrefix: "bud-react-select",
  components: {
    ...reactSelectComponents,
    IndicatorSeparator: () => null,
    Input: InputComponent,
    Option: OptionComponent,
    Control: <
      Option,
      IsMulti extends boolean = false,
      Group extends GroupBase<Option> = GroupBase<Option>
    >({
      ...props
    }: ControlProps<Option, IsMulti, Group>) => (
      <ControlComponent {...props} unstyled={unstyledControl} />
    ),
    SingleValue: SingleValueComponent,
    Menu: MenuComponent,
    MenuList: MenuListComponent,
    ValueContainer: ValueContainerComponent,
    MultiValue: MultiValueComponent,
    ...components,
  },
});

const Select = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  components,
  name,
  unstyledControl,
  ...props
}: AsyncSelectProps<Option, IsMulti, Group> & {
  name?: string;
  unstyledControl?: boolean;
}) => {
  const reactSelectProps = React.useMemo(() => {
    return getReactSelectProps<Option, IsMulti, Group>({
      className,
      components: components || {},
      unstyledControl,
    });
  }, [className, components]);

  return (
    <>
      <AsyncSelect
        {...reactSelectProps}
        {...props}
        styles={{
          control: () => ({
            // ...base,
          }),
          // option: (base) => ({
          //   border: "1px dotted red",
          //   background: "red",
          // }),
        }}
      />
    </>
  );
};

export default Select;
