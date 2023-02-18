import { cn } from "@/utils/cn";
import { Check } from "lucide-react";
import {
  components as reactSelectComponents,
  ControlProps,
  GroupBase,
  InputProps,
  MenuListProps,
  MenuProps,
  MultiValueProps,
  OptionProps,
  SingleValueProps,
  ValueContainerProps,
} from "react-select";

export const InputComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  inputClassName,
  ...props
}: InputProps<Option, IsMulti, Group>) => {
  return (
    <reactSelectComponents.Input
      // disables our default form focus hightlight on the react-select input element
      inputClassName={cn(
        "focus:ring-0 focus:ring-offset-0 text-black",
        inputClassName
      )}
      {...props}
    />
  );
};

export const OptionComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: OptionProps<Option, IsMulti, Group>) => {
  return (
    <reactSelectComponents.Option
      {...props}
      className={cn(
        className,
        "!flex !cursor-pointer justify-between !py-3",
        props.isFocused &&
          !props.isSelected &&
          "!bg-gray-100 dark:!bg-transparent",
        props.isSelected
          ? "dark:!bg-dark-accent-100 !bg-neutral-900"
          : "dark:hover:!bg-dark-tertiary"
      )}
    >
      <span>{props.label}</span>{" "}
      {props.isSelected && <Check className="h-4 w-4" />}
    </reactSelectComponents.Option>
  );
};

export const ControlComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  unstyled,
  ...props
}: ControlProps<Option, IsMulti, Group> & {
  unstyled?: boolean;
}) => (
  <reactSelectComponents.Control
    {...props}
    className={cn(
      "flex h-full cursor-pointer justify-between",
      "text-sm leading-4 transition-all placeholder:text-sm placeholder:font-normal [&_svg]:transition-colors",
      !unstyled &&
        "dark:bg-dark-300 dark:shadow-100 dark:hover:shadow-200 [&_svg]:dark:hover:text-dark-neutral rounded-md border border-gray-300 bg-white hover:border-gray-400 dark:border-transparent",
      !unstyled &&
        props.isFocused &&
        "dark:border-dark-accent-200 dark:shadow-darkAccent [&_svg]:dark:text-dark-800 border-gray-400 ring-2 ring-gray-600 ring-offset-2 dark:ring-1 dark:ring-offset-0",
      className
    )}
  />
);

export const SingleValueComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: SingleValueProps<Option, IsMulti, Group>) => (
  <reactSelectComponents.SingleValue
    {...props}
    className={cn(
      className,
      "dark:text-darkgray-900 dark:placeholder:text-darkgray-500 text-black placeholder:text-gray-400"
    )}
  />
);

export const ValueContainerComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: ValueContainerProps<Option, IsMulti, Group>) => (
  <reactSelectComponents.ValueContainer
    {...props}
    className={cn(
      "dark:text-darkgray-900 dark:placeholder:text-darkgray-500 text-black placeholder:text-gray-400",
      className
    )}
  />
);

export const MultiValueComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: MultiValueProps<Option, IsMulti, Group>) => (
  <reactSelectComponents.MultiValue
    {...props}
    className={cn(
      "dark:bg-darkgray-200 dark:text-darkgray-900 !rounded-md bg-gray-100 text-gray-700",
      className
    )}
  />
);

export const MenuComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: MenuProps<Option, IsMulti, Group>) => (
  <reactSelectComponents.Menu
    {...props}
    className={cn(
      "!rounded-md bg-white text-sm leading-4",
      "dark:border-dark-400 dark:bg-dark-300 dark:shadow-darkTransparent",
      className
    )}
  />
);

export const MenuListComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: MenuListProps<Option, IsMulti, Group>) => (
  <reactSelectComponents.MenuList
    {...props}
    className={cn(
      "scrollbar-track-w-[80px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 scrollbar-thumb-rounded-md rounded-md ",
      "dark:scrollbar-thumb-dark-accent-100 dark:hover:scrollbar-thumb-dark-accent-300",
      className
    )}
  />
);
