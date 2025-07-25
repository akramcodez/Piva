'use client';

import React from 'react';
import { useWebinarStore } from '@/store/useWebinarStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from '@/components/ui/select';

const BasicInfoStep = () => {
  const { formData, updateBasicInfo, getStepvalidationError } =
    useWebinarStore();

  const { webinarName, description, date, time, timeFormat } =
    formData.basicInfo;

  const errors = getStepvalidationError('basicInfo');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    updateBasicInfo(name as keyof typeof formData.basicInfo, value);
  };

  const handleDateChange = (newDate: Date | undefined) => {
    updateBasicInfo('date', newDate);
  };

  const handleFormetChange = (value: string) => {
    updateBasicInfo('timeFormat', value as 'AM' | 'PM');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label
          htmlFor="webinarName"
          className={errors.webinarName ? 'text-red-400' : ''}
        >
          Webinar Name <span className="text-red-400">*</span>
        </Label>
        <Input
          id="webinarName"
          name="webinarName"
          value={webinarName}
          onChange={handleChange}
          placeholder="Webinar Title"
          className={cn(
            '!bg-background/50 border border-input',
            errors.webinarName && 'border-red-400 focus-visible:ring-red-400',
          )}
        />
        {errors.webinarName && (
          <p className="text-sm text-red-400">{errors.webinarName}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="description"
          className={errors.description ? 'text-red-400' : ''}
        >
          Description <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id="description"
          name="description"
          value={description || ''}
          onChange={handleChange}
          placeholder="Tell customer what your webinar is about"
          className={cn(
            'min-h-[100px] !bg-background/50 border border-input',
            errors.description && 'border-red-400 focus-visible:ring-red-400',
          )}
        ></Textarea>
        {errors.description && (
          <p className="text-xs text-red-400">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label className={errors.date ? 'text-red-400' : ''}>
            Webinar Date <span className="text-red-400">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal !bg-background/50 border border-input',
                  !date && 'text-gray-500',
                  errors.date && 'border-red-400 focus-visible:ring-red-400',
                )}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 !bg-backround/50 border border-input">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                initialFocus
                className="bg-background"
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
              />
            </PopoverContent>
          </Popover>
          {errors.date && <p className="text-xs text-red-400">{errors.date}</p>}
        </div>

        <div className="space-y-2">
          <Label className={errors.time ? 'text-red-400' : ''}>
            Webinar Time <span className="text-red-400">*</span>
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-foreground" />
              <Input
                name="time"
                value={time || ''}
                onChange={handleChange}
                placeholder="12:00"
                className={cn(
                  'pl-9 !bg-background/50 border border-input',
                  errors.time && 'border-red-400 focus-visible:ring-red-400',
                )}
              />
            </div>
            <Select
              value={timeFormat || 'AM'}
              onValueChange={handleFormetChange}
            >
              <SelectTrigger className="w-20 !bg-background/50 border border-input">
                <SelectValue placeholder="AM" />
              </SelectTrigger>
              <SelectContent className="bg-background border rounded-md border-input">
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {errors.time && <p className="text-xs text-red-400">{errors.time}</p>}
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep;
